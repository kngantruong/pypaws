use Lost_FoundDB
go

--   A. USERS

-- A1. Đăng ký người dùng (password_hash do Backend băm sẵn). Trả về user_id.
create or alter procedure usp_CreateUser
    @email nvarchar(255), @password_hash nvarchar(255),
    @full_name nvarchar(100) = null, @phone nvarchar(20) = null
as
begin
    set nocount on;
    if exists (select 1 from users where email = @email)
        throw 50001, N'Email đã tồn tại', 1;
    insert into users (email, password, full_name, phone) values (@email, @password_hash, @full_name, @phone);
    select cast(scope_identity() as int) as user_id;
end
go

-- A2. Lấy user theo email để đăng nhập (Backend tự so hash).
create or alter procedure usp_GetUserByEmail @email nvarchar(255)
as
begin
    set nocount on;
    select user_id, email, password, full_name, phone, user_type, created_at
    from users where email = @email;
end
go

--   B. POSTS (LOST / FOUND)

-- B1. Tạo bài đăng. Trả về post_id.
create or alter procedure usp_CreatePost
    @user_id int, @post_type varchar(10), @species varchar(10),
    @description nvarchar(max) = null, @event_time datetime2 = null,
    @latitude decimal(9,6) = null, @longitude decimal(9,6) = null,
    @location_text nvarchar(255) = null, @data_source varchar(10) = 'USER'
as
begin
    set nocount on;
    insert into posts (user_id, post_type, species, description, event_time, latitude, longitude, location_text, data_source)
    values (@user_id, @post_type, @species, @description, @event_time, @latitude, @longitude, @location_text, @data_source);
    select cast(scope_identity() as int) as post_id;
end
go

-- B2. Thêm ảnh cho bài đăng. Nếu is_primary = 1 thì ảnh đại diện cũ tự bị bỏ cờ.
create or alter procedure usp_AddPostImage
    @post_id int, @image_path nvarchar(500), @is_primary bit = 0
as
begin
    set nocount on;
    set xact_abort on;
    begin tran;
        if @is_primary = 1
            update post_images set is_primary = 0 where post_id = @post_id and is_primary = 1;
        insert into post_images (post_id, image_path, is_primary) values (@post_id, @image_path, @is_primary);
    commit;
    select cast(scope_identity() as int) as image_id;
end
go

-- B3. Danh sách bài đăng theo loại (LOST/FOUND), loài (DOG/CAT, null = tất cả), trạng thái; có phân trang.
--     Mỗi dòng có total_count (tổng số bài thỏa điều kiện) và primary_image.
create or alter procedure usp_GetPosts
    @post_type varchar(10),
    @species varchar(10) = null,
    @status varchar(20) = 'ACTIVE',
    @page_number int = 1,
    @page_size int = 20
as
begin
    set nocount on;
    if @page_number < 1 set @page_number = 1;
    if @page_size < 1 set @page_size = 20;
    if @page_size > 100 set @page_size = 100;

    select  p.post_id, p.post_type, p.species, p.description, p.event_time,
            p.latitude, p.longitude, p.location_text, p.status, p.created_at,
            u.user_id, u.full_name as owner_name,
            img.image_path as primary_image,
            count(*) over () as total_count
    from posts p
    join users u on u.user_id = p.user_id
    outer apply (select top 1 i.image_path from post_images i
                 where i.post_id = p.post_id
                 order by i.is_primary desc, i.image_id) img
    where p.post_type = @post_type
      and (@species is null or p.species = @species)
      and (@status is null or p.status = @status)
    order by p.event_time desc, p.post_id desc
    offset (@page_number - 1) * @page_size rows fetch next @page_size rows only
    option (recompile);
end
go

-- B4. Chi tiết một bài đăng. Trả về 2 result set: (1) bài + người đăng, (2) toàn bộ ảnh.
create or alter procedure usp_GetPostDetail @post_id int
as
begin
    set nocount on;
    if not exists (select 1 from posts where post_id = @post_id)
        throw 50002, N'Không tìm thấy bài đăng', 1;

    select  p.post_id, p.post_type, p.species, p.description, p.event_time,
            p.latitude, p.longitude, p.location_text, p.status, p.data_source, p.created_at,
            u.user_id, u.full_name as owner_name, u.phone as owner_phone
    from posts p join users u on u.user_id = p.user_id
    where p.post_id = @post_id;

    select image_id, post_id, image_path, is_primary, created_at
    from post_images where post_id = @post_id
    order by is_primary desc, image_id;
end
go

-- B5. Đổi trạng thái bài đăng (ACTIVE, MATCHED, CLOSED, EXPIRED).
create or alter procedure usp_UpdatePostStatus @post_id int, @status varchar(20)
as
begin
    set nocount on;
    update posts set status = @status where post_id = @post_id;
    if @@rowcount = 0 throw 50002, N'Không tìm thấy bài đăng', 1;
end
go

--   C. EMBEDDING + MATCHING (phục vụ pipeline AI / DINOv2)
    

-- C1. Ảnh CHƯA có embedding của model/version chỉ định (để AI xử lý theo lô).
create or alter procedure usp_GetImagesNeedingEmbedding
    @model_name varchar(50), @model_version varchar(50), @top int = 100
as
begin
    set nocount on;
    select top (@top) i.image_id, i.post_id, i.image_path, i.is_primary
    from post_images i
    where not exists (select 1 from image_embeddings e
                      where e.image_id = i.image_id
                        and e.model_name = @model_name and e.model_version = @model_version)
    order by i.image_id;
end
go

-- C2. Lưu (thêm hoặc cập nhật) embedding của một ảnh.
create or alter procedure usp_SaveImageEmbedding
    @image_id int, @model_name varchar(50), @model_version varchar(50),
    @embedding varbinary(max), @dim smallint, @dtype varchar(10) = 'float32'
as
begin
    set nocount on;
    set xact_abort on;
    begin tran;
        update image_embeddings
           set embedding = @embedding, dim = @dim, dtype = @dtype, created_at = sysutcdatetime()
         where image_id = @image_id and model_name = @model_name and model_version = @model_version;
        if @@rowcount = 0
            insert into image_embeddings (image_id, model_name, model_version, embedding, dim, dtype)
            values (@image_id, @model_name, @model_version, @embedding, @dim, @dtype);
    commit;
end
go

-- C3. Tập bài để đối chiếu cho 1 bài (query): cùng loài, loại ĐỐI DIỆN (LOST tìm FOUND và ngược lại),
--     đang ACTIVE, có embedding ảnh đại diện. Backend/AI lấy về để tính điểm.
create or alter procedure usp_GetSearchPool
    @query_post_id int, @model_name varchar(50), @model_version varchar(50)
as
begin
    set nocount on;
    declare @species varchar(10), @type varchar(10);
    select @species = species, @type = post_type from posts where post_id = @query_post_id;
    if @species is null throw 50002, N'Không tìm thấy bài đăng', 1;

    select  p.post_id, p.post_type, p.event_time, p.latitude, p.longitude,
            i.image_id, e.embedding, e.dim, e.dtype
    from posts p
    join post_images i on i.post_id = p.post_id and i.is_primary = 1
    join image_embeddings e on e.image_id = i.image_id
                           and e.model_name = @model_name and e.model_version = @model_version
    where p.species = @species
      and p.status = 'ACTIVE'
      and p.post_type = case @type when 'LOST' then 'FOUND' else 'LOST' end
      and p.post_id <> @query_post_id;
end
go

-- C4. Xóa kết quả gợi ý cũ của một bài (trước khi chạy lại matching).
create or alter procedure usp_ClearCandidates @query_post_id int
as
begin
    set nocount on;
    delete from candidates where query_post_id = @query_post_id;
end
go

-- C5. Lưu một kết quả gợi ý (thêm mới hoặc cập nhật nếu cặp đã tồn tại).
create or alter procedure usp_SaveCandidate
    @query_post_id int, @candidate_post_id int,
    @image_score decimal(7,5) = null, @distance_km decimal(9,2) = null, @time_gap_hours decimal(10,2) = null,
    @final_score decimal(7,5), @rank_no int, @passed_threshold bit, @reason nvarchar(500) = null
as
begin
    set nocount on;
    set xact_abort on;
    begin tran;
        update candidates
           set image_score = @image_score, distance_km = @distance_km, time_gap_hours = @time_gap_hours,
               final_score = @final_score, rank_no = @rank_no, passed_threshold = @passed_threshold,
               reason = @reason, created_at = sysutcdatetime()
         where query_post_id = @query_post_id and candidate_post_id = @candidate_post_id;
        if @@rowcount = 0
            insert into candidates (query_post_id, candidate_post_id, image_score, distance_km, time_gap_hours,
                                    final_score, rank_no, passed_threshold, reason)
            values (@query_post_id, @candidate_post_id, @image_score, @distance_km, @time_gap_hours,
                    @final_score, @rank_no, @passed_threshold, @reason);
    commit;
end
go

-- C6. Danh sách gợi ý của một bài, xếp theo thứ hạng. @only_passed = 1 chỉ lấy bài đạt ngưỡng.
create or alter procedure usp_GetCandidatesForPost
    @query_post_id int, @only_passed bit = 0
as
begin
    set nocount on;
    select  c.candidate_id, c.rank_no, c.final_score, c.image_score, c.distance_km,
            c.time_gap_hours, c.passed_threshold, c.reason,
            p.post_id as candidate_post_id, p.post_type, p.species, p.description, p.event_time,
            p.latitude, p.longitude, p.location_text, p.status,
            u.full_name as owner_name, u.phone as owner_phone,
            img.image_path as primary_image
    from candidates c
    join posts p on p.post_id = c.candidate_post_id
    join users u on u.user_id = p.user_id
    outer apply (select top 1 i.image_path from post_images i
                 where i.post_id = p.post_id
                 order by i.is_primary desc, i.image_id) img
    where c.query_post_id = @query_post_id
      and (@only_passed = 0 or c.passed_threshold = 1)
    order by c.rank_no;
end
go

  -- D. NOTIFICATIONS

create or alter procedure usp_CreateNotification
    @user_id int, @notification_type varchar(30), @title nvarchar(200),
    @message nvarchar(1000), @related_candidate_id int = null
as
begin
    set nocount on;
    insert into notifications (user_id, notification_type, title, message, related_candidate_id)
    values (@user_id, @notification_type, @title, @message, @related_candidate_id);
    select cast(scope_identity() as int) as notification_id;
end
go

-- Lấy thông báo của người dùng (@unread_only = 1: chỉ chưa đọc), mới nhất trước.
create or alter procedure usp_GetNotifications
    @user_id int, @unread_only bit = 1, @top int = 50
as
begin
    set nocount on;
    select top (@top) notification_id, notification_type, title, message,
           related_candidate_id, is_read, created_at
    from notifications
    where user_id = @user_id and (@unread_only = 0 or is_read = 0)
    order by created_at desc, notification_id desc;
end
go

create or alter procedure usp_MarkNotificationRead @notification_id int, @user_id int
as
begin
    set nocount on;
    update notifications set is_read = 1
    where notification_id = @notification_id and user_id = @user_id;
    if @@rowcount = 0 throw 50003, N'Không tìm thấy thông báo', 1;
end
go

  -- E. ADOPTION

-- E1. Danh sách thú cần nhận nuôi theo bộ lọc (tham số null = bỏ qua), có phân trang.
create or alter procedure usp_GetAdoptPets
    @species varchar(10) = null, @city nvarchar(100) = null, @size varchar(10) = null,
    @housing varchar(15) = null, @status varchar(10) = 'AVAILABLE',
    @page_number int = 1, @page_size int = 20
as
begin
    set nocount on;
    if @page_number < 1 set @page_number = 1;
    if @page_size < 1 set @page_size = 20;
    if @page_size > 100 set @page_size = 100;

    select  ap.pet_id, ap.pet_name, ap.species, ap.breed, ap.sex, ap.age_months, ap.size,
            ap.coat_color, ap.is_vaccinated, ap.is_neutered, ap.requires_special_care,
            ap.good_with_kids, ap.good_with_pets, ap.housing_requirement, ap.city, ap.status,
            img.image_path as primary_image,
            count(*) over () as total_count
    from adopt_pets ap
    outer apply (select top 1 i.image_path from adopt_pet_images i
                 where i.pet_id = ap.pet_id
                 order by i.is_primary desc, i.pet_image_id) img
    where (@species is null or ap.species = @species)
      and (@city is null or ap.city = @city)
      and (@size is null or ap.size = @size)
      and (@housing is null or ap.housing_requirement in ('ANY', @housing))
      and (@status is null or ap.status = @status)
    order by ap.created_at desc, ap.pet_id desc
    offset (@page_number - 1) * @page_size rows fetch next @page_size rows only
    option (recompile);
end
go

-- E2. Chi tiết một thú nhận nuôi: (1) thông tin + người đăng, (2) ảnh.
create or alter procedure usp_GetAdoptPetDetail @pet_id int
as
begin
    set nocount on;
    if not exists (select 1 from adopt_pets where pet_id = @pet_id)
        throw 50004, N'Không tìm thấy thú nhận nuôi', 1;

    select ap.*, u.full_name as owner_name, u.phone as owner_phone
    from adopt_pets ap join users u on u.user_id = ap.user_id
    where ap.pet_id = @pet_id;

    select pet_image_id, pet_id, image_path, is_primary, created_at
    from adopt_pet_images where pet_id = @pet_id
    order by is_primary desc, pet_image_id;
end
go

-- E3. Gửi đơn xin nhận nuôi. Trả về request_id.
create or alter procedure usp_CreateAdoptionRequest
    @adopter_id int, @pet_id int, @message nvarchar(500) = null
as
begin
    set nocount on;
    if not exists (select 1 from adopt_pets where pet_id = @pet_id and status = 'AVAILABLE')
        throw 50005, N'Thú không còn sẵn để nhận nuôi', 1;
    if exists (select 1 from adoption_requests where adopter_id = @adopter_id and pet_id = @pet_id)
        throw 50006, N'Bạn đã gửi đơn cho thú này', 1;
    insert into adoption_requests (adopter_id, pet_id, message) values (@adopter_id, @pet_id, @message);
    select cast(scope_identity() as int) as request_id;
end
go

-- E4. Duyệt / từ chối / hủy đơn. APPROVED: thú chuyển ADOPTED và các đơn PENDING khác của thú đó bị REJECTED.
create or alter procedure usp_UpdateAdoptionRequestStatus
    @request_id int, @new_status varchar(15)
as
begin
    set nocount on;
    set xact_abort on;
    if @new_status not in ('APPROVED', 'REJECTED', 'CANCELLED')
        throw 50007, N'Trạng thái không hợp lệ', 1;

    declare @pet_id int;
    begin tran;
        update adoption_requests
           set status = @new_status, @pet_id = pet_id
         where request_id = @request_id and status = 'PENDING';
        if @@rowcount = 0
        begin
            rollback;
            throw 50008, N'Đơn không tồn tại hoặc không còn ở trạng thái PENDING', 1;
        end
        if @new_status = 'APPROVED'
        begin
            update adopt_pets set status = 'ADOPTED' where pet_id = @pet_id;
            update adoption_requests set status = 'REJECTED'
             where pet_id = @pet_id and request_id <> @request_id and status = 'PENDING';
        end
    commit;
end
go

-- E5. Các đơn xin nhận nuôi của một thú (cho người đăng xem).
create or alter procedure usp_GetRequestsForPet @pet_id int
as
begin
    set nocount on;
    select r.request_id, r.status, r.message, r.created_at,
           a.adopter_id, a.housing_type, a.has_children, a.has_other_pets, a.experience_level,
           a.daily_care_hours, a.city, u.full_name, u.phone
    from adoption_requests r
    join adopters a on a.adopter_id = r.adopter_id
    join users u on u.user_id = a.user_id
    where r.pet_id = @pet_id
    order by r.created_at desc;
end
go

  --F. CHẠY THỬ
exec usp_GetPosts @post_type = 'FOUND', @species = 'CAT';
exec usp_GetPostDetail @post_id = 1;
exec usp_GetCandidatesForPost @query_post_id = 1;
exec usp_GetCandidatesForPost @query_post_id = 7, @only_passed = 1;
exec usp_GetImagesNeedingEmbedding @model_name = 'dinov2_pretrained', @model_version = 'v1';
exec usp_GetNotifications @user_id = 1, @unread_only = 0;
exec usp_GetAdoptPets @species = 'DOG';
exec usp_CreateAdoptionRequest @adopter_id = 3, @pet_id = 6, @message = N'Mình muốn nhận nuôi';
exec usp_UpdateAdoptionRequestStatus @request_id = 1, @new_status = 'APPROVED';
go
--test
exec usp_GetPosts @post_type = 'FOUND', @species = 'CAT'
exec usp_GetPostDetail @post_id = 1
exec usp_GetCandidatesForPost @query_post_id = 1
exec usp_GetImagesNeedingEmbedding @model_name = 'dinov2_pretrained', @model_version = 'v1'
