
set client_encoding to 'UTF8';
-- users---

-- Đăng ký .Trả về user_id. Email trùng -> lỗi unique_violation.
create or replace function create_user(
    p_email text, p_password_hash text, p_full_name text default null, p_phone text default null
) returns integer
language sql as $$
    insert into users (email, password, full_name, phone)
    values (p_email, p_password_hash, p_full_name, p_phone)
    returning user_id;
$$;

-- Lấy user theo email để đăng nhập 
create or replace function get_user_by_email(p_email text)
returns table (user_id integer, email text, password text, full_name text, phone text,
               user_type text, created_at timestamptz)
language sql stable as $$
    select u.user_id, u.email::text, u.password::text, u.full_name::text, u.phone::text,
           u.user_type::text, u.created_at
    from users u
    where lower(u.email) = lower(p_email);
$$;

--post--


create or replace function create_post(
    p_user_id integer, p_post_type text, p_species text, p_description text,
    p_event_time timestamptz, p_location_text text, p_image_paths text[],
    p_gender text default null, p_breed text default null, p_coat_color text default null,
    p_appearance_notes text default null, p_latitude numeric default null,
    p_longitude numeric default null, p_cover_index integer default 0,
    p_data_source text default 'USER'
) returns integer
language plpgsql as $$
declare
    v_post_id integer;
    v_count   integer := coalesce(array_length(p_image_paths, 1), 0);
begin
    if v_count = 0 then
        raise exception 'Cần ít nhất 1 ảnh' using errcode = 'check_violation';
    end if;
    if p_cover_index < 0 or p_cover_index >= v_count then
        raise exception 'cover_index nằm ngoài danh sách ảnh' using errcode = 'check_violation';
    end if;
    if p_event_time > now() + interval '5 minutes' then
        raise exception 'Thời gian không thể ở tương lai' using errcode = 'check_violation';
    end if;

    insert into posts (user_id, post_type, species, gender, breed, coat_color, appearance_notes,
                       description, event_time, location_text, latitude, longitude, data_source)
    values (p_user_id, p_post_type, p_species, nullif(btrim(p_gender), ''),
            nullif(btrim(p_breed), ''), nullif(btrim(p_coat_color), ''),
            nullif(btrim(p_appearance_notes), ''), btrim(p_description), p_event_time,
            btrim(p_location_text), p_latitude, p_longitude, p_data_source)
    returning post_id into v_post_id;

    for i in 1 .. v_count loop
        insert into post_images (post_id, image_path, is_primary, sort_order)
        values (v_post_id, p_image_paths[i], (i - 1) = p_cover_index, i - 1);
    end loop;

    return v_post_id;
end $$;

-- Danh sách bài (bảng tin), mới nhất trước. Mỗi dòng có total_count (tổng số bài thỏa điều kiện).
--   p_post_type/p_species/p_status = null nghĩa là không lọc.
--   p_after_post_id: chỉ lấy bài có post_id lớn hơn (dùng cho polling "có bài mới" khi demo).
create or replace function get_posts(
    p_post_type text default null, p_species text default null, p_status text default 'ACTIVE',
    p_page integer default 1, p_page_size integer default 20, p_after_post_id integer default null
) returns table (post_id integer, post_type text, species text, gender text, breed text,
                 coat_color text, appearance_notes text, description text, event_time timestamptz,
                 latitude numeric, longitude numeric, location_text text, status text,
                 created_at timestamptz, owner_id integer, owner_name text,
                 primary_image text, total_count bigint)
language sql stable as $$
    select p.post_id, p.post_type::text, p.species::text, p.gender::text, p.breed::text,
           p.coat_color::text, p.appearance_notes::text, p.description, p.event_time,
           p.latitude, p.longitude, p.location_text::text, p.status::text, p.created_at,
           u.user_id, u.full_name::text, img.image_path::text,
           count(*) over () as total_count
    from posts p
    join users u on u.user_id = p.user_id
    left join lateral (
        select i.image_path from post_images i
        where i.post_id = p.post_id
        order by i.is_primary desc, i.sort_order, i.image_id
        limit 1
    ) img on true
    where (p_post_type is null or p.post_type = p_post_type)
      and (p_species is null or p.species = p_species)
      and (p_status is null or p.status = p_status)
      and (p_after_post_id is null or p.post_id > p_after_post_id)
    order by p.created_at desc, p.post_id desc
    limit least(greatest(p_page_size, 1), 100)
    offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 100);
$$;

-- Chi tiết một bài + người đăng (0 dòng nếu không có bài).
create or replace function get_post_detail(p_post_id integer)
returns table (post_id integer, post_type text, species text, gender text, breed text,
               coat_color text, appearance_notes text, description text, event_time timestamptz,
               latitude numeric, longitude numeric, location_text text, status text,
               data_source text, created_at timestamptz, owner_id integer, owner_name text,
               owner_phone text)
language sql stable as $$
    select p.post_id, p.post_type::text, p.species::text, p.gender::text, p.breed::text,
           p.coat_color::text, p.appearance_notes::text, p.description, p.event_time,
           p.latitude, p.longitude, p.location_text::text, p.status::text, p.data_source::text,
           p.created_at, u.user_id, u.full_name::text, u.phone::text
    from posts p join users u on u.user_id = p.user_id
    where p.post_id = p_post_id;
$$;

-- Toàn bộ ảnh của một bài, ảnh bìa đứng đầu.
create or replace function get_post_images(p_post_id integer)
returns table (image_id integer, post_id integer, image_path text, is_primary boolean,
               sort_order smallint, created_at timestamptz)
language sql stable as $$
    select i.image_id, i.post_id, i.image_path::text, i.is_primary, i.sort_order, i.created_at
    from post_images i
    where i.post_id = p_post_id
    order by i.is_primary desc, i.sort_order, i.image_id;
$$;

-- Đổi trạng thái bài (ACTIVE, MATCHED, CLOSED, EXPIRED).
create or replace function update_post_status(p_post_id integer, p_status text)
returns void
language plpgsql as $$
begin
    update posts set status = p_status where post_id = p_post_id;
    if not found then
        raise exception 'Không tìm thấy bài đăng' using errcode = 'no_data_found';
    end if;
end $$;


---embedding + matching 
-- Ảnh CHƯA có embedding của model/version chỉ định.
create or replace function get_images_needing_embedding(
    p_model_name text, p_model_version text, p_limit integer default 100
) returns table (image_id integer, post_id integer, image_path text, is_primary boolean)
language sql stable as $$
    select i.image_id, i.post_id, i.image_path::text, i.is_primary
    from post_images i
    where not exists (
        select 1 from image_embeddings e
        where e.image_id = i.image_id and e.model_name = p_model_name and e.model_version = p_model_version)
    order by i.image_id
    limit p_limit;
$$;

-- Lưu (thêm hoặc ghi đè) embedding của một ảnh.
create or replace function save_image_embedding(
    p_image_id integer, p_model_name text, p_model_version text,
    p_embedding bytea, p_dim smallint, p_dtype text default 'float32'
) returns void
language sql as $$
    insert into image_embeddings (image_id, model_name, model_version, embedding, dim, dtype)
    values (p_image_id, p_model_name, p_model_version, p_embedding, p_dim, p_dtype)
    on conflict (image_id, model_name, model_version)
    do update set embedding = excluded.embedding, dim = excluded.dim,
                  dtype = excluded.dtype, created_at = now();
$$;

-- Tập bài để đối chiếu cho 1 bài: cùng loài, loại ĐỐI DIỆN (LOST tìm FOUND và ngược lại),
-- đang ACTIVE, có embedding của ảnh bìa.
create or replace function get_search_pool(
    p_query_post_id integer, p_model_name text, p_model_version text
) returns table (post_id integer, post_type text, event_time timestamptz, latitude numeric,
                 longitude numeric, image_id integer, embedding bytea, dim smallint, dtype text)
language sql stable as $$
    select p.post_id, p.post_type::text, p.event_time, p.latitude, p.longitude,
           i.image_id, e.embedding, e.dim, e.dtype::text
    from posts q
    join posts p on p.species = q.species
                and p.status = 'ACTIVE'
                and p.post_id <> q.post_id
                and p.post_type = case q.post_type when 'LOST' then 'FOUND' else 'LOST' end
    join post_images i on i.post_id = p.post_id and i.is_primary
    join image_embeddings e on e.image_id = i.image_id
                           and e.model_name = p_model_name and e.model_version = p_model_version
    where q.post_id = p_query_post_id;
$$;

-- Xóa gợi ý cũ của một bài (trước khi chạy lại matching).
create or replace function clear_candidates(p_query_post_id integer)
returns void
language sql as $$
    delete from candidates where query_post_id = p_query_post_id;
$$;

-- Lưu một gợi ý (thêm mới hoặc cập nhật nếu cặp đã tồn tại).
create or replace function save_candidate(
    p_query_post_id integer, p_candidate_post_id integer, p_final_score numeric,
    p_rank_no integer, p_passed_threshold boolean, p_image_score numeric default null,
    p_distance_km numeric default null, p_time_gap_hours numeric default null,
    p_reason text default null
) returns void
language sql as $$
    insert into candidates (query_post_id, candidate_post_id, image_score, distance_km, time_gap_hours,
                            final_score, rank_no, passed_threshold, reason)
    values (p_query_post_id, p_candidate_post_id, p_image_score, p_distance_km, p_time_gap_hours,
            p_final_score, p_rank_no, p_passed_threshold, p_reason)
    on conflict (query_post_id, candidate_post_id)
    do update set image_score = excluded.image_score, distance_km = excluded.distance_km,
                  time_gap_hours = excluded.time_gap_hours, final_score = excluded.final_score,
                  rank_no = excluded.rank_no, passed_threshold = excluded.passed_threshold,
                  reason = excluded.reason, created_at = now();
$$;

-- Gợi ý của một bài theo thứ hạng. p_only_passed = true chỉ lấy bài đạt ngưỡng.
create or replace function get_candidates_for_post(p_query_post_id integer, p_only_passed boolean default false)
returns table (candidate_id integer, rank_no integer, final_score numeric, image_score numeric,
               distance_km numeric, time_gap_hours numeric, passed_threshold boolean, reason text,
               candidate_post_id integer, post_type text, species text, gender text, breed text,
               coat_color text, description text, event_time timestamptz, latitude numeric,
               longitude numeric, location_text text, status text, owner_name text,
               owner_phone text, primary_image text)
language sql stable as $$
    select c.candidate_id, c.rank_no, c.final_score, c.image_score, c.distance_km, c.time_gap_hours,
           c.passed_threshold, c.reason::text,
           p.post_id, p.post_type::text, p.species::text, p.gender::text, p.breed::text,
           p.coat_color::text, p.description, p.event_time, p.latitude, p.longitude,
           p.location_text::text, p.status::text, u.full_name::text, u.phone::text, img.image_path::text
    from candidates c
    join posts p on p.post_id = c.candidate_post_id
    join users u on u.user_id = p.user_id
    left join lateral (
        select i.image_path from post_images i
        where i.post_id = p.post_id
        order by i.is_primary desc, i.sort_order, i.image_id
        limit 1
    ) img on true
    where c.query_post_id = p_query_post_id
      and (not p_only_passed or c.passed_threshold)
    order by c.rank_no;
$$;
-- nortifications


create or replace function create_notification(
    p_user_id integer, p_notification_type text, p_title text, p_message text,
    p_related_candidate_id integer default null
) returns integer
language sql as $$
    insert into notifications (user_id, notification_type, title, message, related_candidate_id)
    values (p_user_id, p_notification_type, p_title, p_message, p_related_candidate_id)
    returning notification_id;
$$;

create or replace function get_notifications(
    p_user_id integer, p_unread_only boolean default true, p_limit integer default 50
) returns table (notification_id integer, notification_type text, title text, message text,
                 related_candidate_id integer, is_read boolean, created_at timestamptz)
language sql stable as $$
    select n.notification_id, n.notification_type::text, n.title::text, n.message::text,
           n.related_candidate_id, n.is_read, n.created_at
    from notifications n
    where n.user_id = p_user_id and (not p_unread_only or not n.is_read)
    order by n.created_at desc, n.notification_id desc
    limit p_limit;
$$;

create or replace function mark_notification_read(p_notification_id integer, p_user_id integer)
returns void
language plpgsql as $$
begin
    update notifications set is_read = true
    where notification_id = p_notification_id and user_id = p_user_id;
    if not found then
        raise exception 'Không tìm thấy thông báo' using errcode = 'no_data_found';
    end if;
end $$;
--chạy thử (từng dòng)--

select * from get_posts('FOUND', 'CAT');
select * from get_posts(p_species => 'DOG', p_page_size => 5);
select * from get_post_detail(1);
select * from get_post_images(1);
select * from get_candidates_for_post(1);
select * from get_candidates_for_post(7, true);
select * from get_images_needing_embedding('dinov2_pretrained', 'v1');
select * from get_notifications(1, false);
-- Đăng bài thử (giống hệt việc nút "Gửi tin đăng" sẽ làm); bài mới sẽ nổi lên đầu get_posts:
select create_post(
	p_user_id => 1, p_post_type => 'LOST', p_species => 'DOG',
	p_description => 'Chó bị lạc gần công viên, có vòng cổ đỏ',
	p_event_time => now() - interval '2 hours', p_location_text => 'Công viên Tao Đàn, Quận 1, TP.HCM',
	p_image_paths => array['uploads/demo1.jpg', 'uploads/demo2.jpg'], p_cover_index => 1,
	p_gender => 'MALE', p_breed => 'Poodle', p_coat_color => 'Trắng',
	p_latitude => 10.7769, p_longitude => 106.6926);
