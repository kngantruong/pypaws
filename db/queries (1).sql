
set client_encoding to 'UTF8';

/* ---------- Dọn các hàm API cũ --------- */
do $$
declare r record;
begin
    for r in
        select p.oid::regprocedure::text as sig
        from pg_proc p
        where p.pronamespace = 'public'::regnamespace
          and p.proname = any (array[
              'create_user','get_user_by_email','create_post','get_posts','get_post_detail','get_post_images',
              'update_post_status','get_images_needing_embedding','save_image_embedding','get_search_pool',
              'clear_candidates','save_candidate','refresh_candidate_ranks','get_candidates_for_post',
              'create_notification','notify_candidate','get_notifications','mark_notification_read',
              'get_contact_info','contact_candidate','reject_candidate','cancel_post','resolve_lost_post'])
    loop
        execute 'drop function if exists ' || r.sig || ' cascade';
    end loop;
end $$;
--- users ----

-- Đăng ký 
create function create_user(
    p_email text, p_password_hash text, p_full_name text default null, p_phone text default null
) returns integer
language sql as $$
    insert into users (email, password, full_name, phone)
    values (p_email, p_password_hash, p_full_name, p_phone)
    returning user_id;
$$;

-- Lấy user theo email để đăng nhập. Chỉ dùng cho chính người đăng nhập.
create function get_user_by_email(p_email text)
returns table (user_id integer, email text, password text, full_name text, phone text,
               user_type text, created_at timestamptz)
language sql stable as $$
    select u.user_id, u.email::text, u.password::text, u.full_name::text, u.phone::text,
           u.user_type::text, u.created_at
    from users u
    where lower(u.email) = lower(p_email);
$$;
--- posts----


create function create_post(
    p_user_id integer, p_post_type text, p_species text, p_description text,
    p_event_time timestamptz, p_location_text text, p_image_paths text[],
    p_gender text default null, p_breed text default null, p_coat_color text default null,
    p_appearance_notes text default null, p_latitude numeric default null,
    p_longitude numeric default null, p_cover_index integer default 0,
    p_data_source text default 'USER'
) returns table (new_post_id integer, new_report_code text)
language plpgsql as $$
declare
    v_post_id     integer;
    v_report_code text;
    v_count       integer := coalesce(array_length(p_image_paths, 1), 0);
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
    returning posts.post_id, posts.report_code into v_post_id, v_report_code;

    for i in 1 .. v_count loop
        insert into post_images (post_id, image_path, is_primary, sort_order)
        values (v_post_id, p_image_paths[i], (i - 1) = p_cover_index, i - 1);
    end loop;

    return query select v_post_id, v_report_code;
end $$;

-- Danh sách bài (bảng tin), mới nhất trước. Mỗi dòng có total_count (tổng số bài thỏa điều kiện).
--   p_post_type/p_species/p_status = null nghĩa là không lọc.
--   p_after_post_id: chỉ lấy bài có post_id lớn hơn (dùng cho polling "có bài mới" khi demo).
-- Không trả số điện thoại.
create function get_posts(
    p_post_type text default null, p_species text default null, p_status text default 'ACTIVE',
    p_page integer default 1, p_page_size integer default 20, p_after_post_id integer default null
) returns table (post_id integer, report_code text, post_type text, species text, gender text,
                 breed text, coat_color text, appearance_notes text, description text,
                 event_time timestamptz, latitude numeric, longitude numeric, location_text text,
                 status text, created_at timestamptz, owner_id integer, owner_name text,
                 primary_image text, total_count bigint)
language sql stable as $$
    select p.post_id, p.report_code::text, p.post_type::text, p.species::text, p.gender::text,
           p.breed::text, p.coat_color::text, p.appearance_notes::text, p.description,
           p.event_time, p.latitude, p.longitude, p.location_text::text,
           p.status::text, p.created_at, u.user_id, u.full_name::text,
           img.image_path::text,
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

-- Chi tiết một bài (công khai). KHÔNG trả số điện thoại; muốn liên hệ phải qua get_contact_info /
-- contact_candidate (có kiểm tra quyền). 0 dòng nếu không có bài.
create function get_post_detail(p_post_id integer)
returns table (post_id integer, report_code text, post_type text, species text, gender text,
               breed text, coat_color text, appearance_notes text, description text,
               event_time timestamptz, latitude numeric, longitude numeric, location_text text,
               status text, resolved_at timestamptz, data_source text, created_at timestamptz,
               owner_id integer, owner_name text)
language sql stable as $$
    select p.post_id, p.report_code::text, p.post_type::text, p.species::text, p.gender::text,
           p.breed::text, p.coat_color::text, p.appearance_notes::text, p.description,
           p.event_time, p.latitude, p.longitude, p.location_text::text,
           p.status::text, p.resolved_at, p.data_source::text, p.created_at,
           u.user_id, u.full_name::text
    from posts p join users u on u.user_id = p.user_id
    where p.post_id = p_post_id;
$$;

-- Toàn bộ ảnh của một bài, ảnh bìa đứng đầu.
create function get_post_images(p_post_id integer)
returns table (image_id integer, post_id integer, image_path text, is_primary boolean,
               sort_order smallint, created_at timestamptz)
language sql stable as $$
    select i.image_id, i.post_id, i.image_path::text, i.is_primary, i.sort_order, i.created_at
    from post_images i
    where i.post_id = p_post_id
    order by i.is_primary desc, i.sort_order, i.image_id;
$$;

-- Người đăng chủ động hủy bài (ACTIVE -> CANCELLED). Các gợi ý còn mở liên quan đến bài
-- (dù bài là LOST hay FOUND) chuyển CANCELLED. Tất cả trong một transaction.
create function cancel_post(p_requester_id integer, p_post_id integer)
returns void
language plpgsql as $$
begin
    update posts p set status = 'CANCELLED'
    where p.post_id = p_post_id and p.user_id = p_requester_id and p.status = 'ACTIVE';
    if not found then
        raise exception 'Chỉ chủ bài đang ACTIVE mới được hủy bài'
            using errcode = 'insufficient_privilege';
    end if;

    update candidates c set status = 'CANCELLED'
    where (c.query_post_id = p_post_id or c.candidate_post_id = p_post_id)
      and c.status in ('PENDING', 'CONTACTED');
end $$;
--- embedding + matching ---- 

create function get_images_needing_embedding(
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
create function save_image_embedding(
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


create function get_search_pool(
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

-- Tính lại rank_no (1 = giống nhất) cho các gợi ý của một bài LOST, theo final_score giảm dần.
create function refresh_candidate_ranks(p_lost_post_id integer)
returns void
language sql as $$
    update candidates c set rank_no = r.rn
    from (select x.candidate_id, row_number() over (order by x.final_score desc, x.candidate_id) as rn
          from candidates x where x.query_post_id = p_lost_post_id) r
    where c.candidate_id = r.candidate_id and c.rank_no <> r.rn;
$$;


create function clear_candidates(p_lost_post_id integer)
returns void
language sql as $$
    delete from candidates where query_post_id = p_lost_post_id and status = 'PENDING';
$$;

-- Lưu một gợi ý theo đúng chiều: p_lost_post_id = bài LOST, p_found_post_id = bài FOUND
-- (trigger sẽ báo lỗi nếu sai chiều hoặc khác loài). Nếu cặp đã có thì chỉ cập nhật điểm,
-- KHÔNG đổi trạng thái. Rank được DB tự tính lại. Trả về candidate_id.
create function save_candidate(
    p_lost_post_id integer, p_found_post_id integer, p_final_score numeric,
    p_passed_threshold boolean, p_image_score numeric default null,
    p_distance_km numeric default null, p_time_gap_hours numeric default null,
    p_reason text default null
) returns integer
language plpgsql as $$
declare
    v_id integer;
begin
    insert into candidates (query_post_id, candidate_post_id, image_score, distance_km, time_gap_hours,
                            final_score, rank_no, passed_threshold, reason)
    values (p_lost_post_id, p_found_post_id, p_image_score, p_distance_km, p_time_gap_hours,
            p_final_score, 1, p_passed_threshold, p_reason)
    on conflict (query_post_id, candidate_post_id)
    do update set image_score = excluded.image_score, distance_km = excluded.distance_km,
                  time_gap_hours = excluded.time_gap_hours, final_score = excluded.final_score,
                  passed_threshold = excluded.passed_threshold, reason = excluded.reason
    returning candidate_id into v_id;

    perform refresh_candidate_ranks(p_lost_post_id);
    return v_id;
end $$;

-- Danh sách gợi ý của một bài LOST theo thứ hạng.
--   p_only_passed = true : chỉ lấy gợi ý đạt ngưỡng.   p_status = null : mọi trạng thái.
-- KHÔNG trả tên/số điện thoại người đăng bài FOUND (xem get_contact_info).
create function get_candidates_for_post(
    p_lost_post_id integer, p_only_passed boolean default false, p_status text default null
) returns table (candidate_id integer, status text, rank_no integer, final_score numeric,
                 image_score numeric, distance_km numeric, time_gap_hours numeric,
                 passed_threshold boolean, reason text, decision_at timestamptz,
                 found_post_id integer, found_report_code text, species text, gender text,
                 breed text, coat_color text, appearance_notes text, description text,
                 event_time timestamptz, latitude numeric, longitude numeric,
                 location_text text, found_status text, primary_image text)
language sql stable as $$
    select c.candidate_id, c.status::text, c.rank_no, c.final_score, c.image_score,
           c.distance_km, c.time_gap_hours, c.passed_threshold, c.reason::text, c.decision_at,
           p.post_id, p.report_code::text, p.species::text, p.gender::text,
           p.breed::text, p.coat_color::text, p.appearance_notes::text, p.description,
           p.event_time, p.latitude, p.longitude,
           p.location_text::text, p.status::text, img.image_path::text
    from candidates c
    join posts p on p.post_id = c.candidate_post_id
    left join lateral (
        select i.image_path from post_images i
        where i.post_id = p.post_id
        order by i.is_primary desc, i.sort_order, i.image_id
        limit 1
    ) img on true
    where c.query_post_id = p_lost_post_id
      and (not p_only_passed or c.passed_threshold)
      and (p_status is null or c.status = p_status)
    order by c.rank_no;
$$;

/* =====================================================================
   D. LIÊN HỆ + QUYẾT ĐỊNH CỦA NGƯỜI LOST (có kiểm tra quyền)
   ===================================================================== */

-- Thông tin liên hệ của người đăng bài FOUND. Chỉ trả khi ĐỦ điều kiện:
--   (1) p_requester_id là chủ bài LOST của gợi ý (Backend đã xác thực đăng nhập),
--   (2) gợi ý đang PENDING hoặc CONTACTED,
--   (3) bài LOST và bài FOUND đều còn ACTIVE (chưa RESOLVED / CANCELLED).
-- Không đủ điều kiện -> 0 dòng (Backend trả 403).
create function get_contact_info(p_requester_id integer, p_candidate_id integer)
returns table (contact_name text, contact_phone text)
language sql stable as $$
    select u.full_name::text, u.phone::text
    from candidates c
    join posts lp on lp.post_id = c.query_post_id
                 and lp.user_id = p_requester_id and lp.status = 'ACTIVE'
    join posts fp on fp.post_id = c.candidate_post_id and fp.status = 'ACTIVE'
    join users u on u.user_id = fp.user_id
    where c.candidate_id = p_candidate_id
      and c.status in ('PENDING', 'CONTACTED');
$$;

-- Người LOST bấm "Liên hệ": kiểm tra quyền, chuyển gợi ý PENDING -> CONTACTED (ghi decision_at)
-- rồi trả thông tin liên hệ. Gọi lại khi đã CONTACTED vẫn trả thông tin, không đổi gì.
create function contact_candidate(p_requester_id integer, p_candidate_id integer)
returns table (contact_name text, contact_phone text)
language plpgsql as $$
declare
    v_ok integer;
begin
    select 1 into v_ok from get_contact_info(p_requester_id, p_candidate_id);
    if v_ok is null then
        raise exception 'Không có quyền xem thông tin liên hệ của gợi ý này'
            using errcode = 'insufficient_privilege';
    end if;

    update candidates c set status = 'CONTACTED', decision_at = coalesce(c.decision_at, now())
    where c.candidate_id = p_candidate_id and c.status = 'PENDING';

    return query select g.contact_name, g.contact_phone
                 from get_contact_info(p_requester_id, p_candidate_id) g;
end $$;

-- Người LOST chọn "Không phải bé nhà mình": PENDING/CONTACTED -> REJECTED.
create function reject_candidate(p_requester_id integer, p_candidate_id integer)
returns void
language plpgsql as $$
begin
    update candidates c set status = 'REJECTED', decision_at = now()
    from posts lp
    where c.candidate_id = p_candidate_id
      and lp.post_id = c.query_post_id
      and lp.user_id = p_requester_id and lp.status = 'ACTIVE'
      and c.status in ('PENDING', 'CONTACTED');
    if not found then
        raise exception 'Không thể từ chối gợi ý này' using errcode = 'insufficient_privilege';
    end if;
end $$;
--- thông báo 

-- Tạo thông báo "có bài FOUND giống bài LOST của bạn" cho gợi ý p_candidate_id.
-- Chỉ tạo khi: gợi ý còn PENDING, bài LOST và bài FOUND đều ACTIVE. Người nhận luôn là chủ bài LOST
-- (không bao giờ là chủ bài FOUND). Chống trùng bằng unique index: gọi lại sẽ không tạo thêm.
-- Trả về notification_id, hoặc NULL nếu không tạo (không đủ điều kiện / đã gửi rồi).
create function notify_candidate(p_candidate_id integer)
returns integer
language sql as $$
    insert into notifications (user_id, notification_type, title, message, related_candidate_id)
    select lp.user_id, 'CANDIDATE_FOUND',
           'Có bài đăng có thể là thú cưng của bạn',
           'Hệ thống tìm thấy một bài FOUND có độ tương đồng cao với bài ' || lp.report_code
               || '. Hãy xem chi tiết để xác minh.',
           c.candidate_id
    from candidates c
    join posts lp on lp.post_id = c.query_post_id and lp.post_type = 'LOST' and lp.status = 'ACTIVE'
    join posts fp on fp.post_id = c.candidate_post_id and fp.status = 'ACTIVE'
    where c.candidate_id = p_candidate_id and c.status = 'PENDING'
    on conflict do nothing
    returning notification_id;
$$;

create function get_notifications(
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

create function mark_notification_read(p_notification_id integer, p_user_id integer)
returns void
language plpgsql as $$
begin
    update notifications set is_read = true
    where notification_id = p_notification_id and user_id = p_user_id;
    if not found then
        raise exception 'Không tìm thấy thông báo' using errcode = 'no_data_found';
    end if;
end $$;
--- hoàn tất tìm kiếm ---- 

-- Người LOST xác nhận đã tìm thấy thú cưng.
--  * p_candidate_id có giá trị  -> tìm thấy nhờ bài FOUND trên PyPaws:
--        bài LOST, bài FOUND tương ứng, gợi ý tương ứng -> RESOLVED (nguồn PYPAWS_MATCH).
--  * p_candidate_id = null      -> tìm thấy nhờ nguồn khác (p_source: SOCIAL_MEDIA, SHELTER,
--        SELF_FOUND, OTHER): bài LOST -> RESOLVED, các gợi ý còn mở của bài LOST -> CANCELLED;
--        các bài FOUND vẫn giữ ACTIVE.
-- BỔ SUNG so với đề xuất ban đầu (xóa nếu nhóm không đồng ý): trường hợp thứ nhất cũng chuyển
-- CANCELLED các gợi ý còn mở khác của bài LOST và các gợi ý còn mở khác trỏ tới bài FOUND vừa
-- RESOLVED, để không còn gợi ý "treo".
create function resolve_lost_post(
    p_requester_id integer, p_lost_post_id integer, p_source text default null,
    p_candidate_id integer default null
) returns void
language plpgsql as $$
declare
    v_found_post_id integer;
begin
    -- khóa bài LOST, đồng thời kiểm tra quyền và trạng thái
    perform 1 from posts p
    where p.post_id = p_lost_post_id and p.post_type = 'LOST'
      and p.user_id = p_requester_id and p.status = 'ACTIVE'
    for update;
    if not found then
        raise exception 'Chỉ chủ bài LOST đang ACTIVE mới được xác nhận đã tìm thấy'
            using errcode = 'insufficient_privilege';
    end if;

    if p_candidate_id is not null then
        select c.candidate_post_id into v_found_post_id
        from candidates c
        join posts fp on fp.post_id = c.candidate_post_id
        where c.candidate_id = p_candidate_id and c.query_post_id = p_lost_post_id
          and c.status in ('PENDING', 'CONTACTED') and fp.status = 'ACTIVE'
        for update of c, fp;
        if v_found_post_id is null then
            raise exception 'Gợi ý không hợp lệ hoặc bài FOUND không còn ACTIVE'
                using errcode = 'check_violation';
        end if;

        update posts p
           set status = 'RESOLVED', resolved_at = now(), resolution_source = 'PYPAWS_MATCH'
         where p.post_id in (p_lost_post_id, v_found_post_id);

        update candidates c
           set status = 'RESOLVED', decision_at = coalesce(c.decision_at, now()),
               resolved_at = now(), resolution_source = 'PYPAWS_MATCH'
         where c.candidate_id = p_candidate_id;

        update candidates c set status = 'CANCELLED'
         where c.candidate_id <> p_candidate_id
           and c.status in ('PENDING', 'CONTACTED')
           and (c.query_post_id = p_lost_post_id or c.candidate_post_id = v_found_post_id);
    else
        if p_source is null or p_source not in ('SOCIAL_MEDIA', 'SHELTER', 'SELF_FOUND', 'OTHER') then
            raise exception 'p_source phải là SOCIAL_MEDIA, SHELTER, SELF_FOUND hoặc OTHER'
                using errcode = 'check_violation';
        end if;

        update posts p
           set status = 'RESOLVED', resolved_at = now(), resolution_source = p_source
         where p.post_id = p_lost_post_id;

        update candidates c set status = 'CANCELLED'
         where c.query_post_id = p_lost_post_id and c.status in ('PENDING', 'CONTACTED');
    end if;
end $$;
---- chạy thử ---- 

select * from get_posts('FOUND', 'CAT');
select * from get_post_detail(1);                       -- không có số điện thoại
select * from get_candidates_for_post(1);               -- không có tên/số điện thoại
select * from get_candidates_for_post(7, true);
select * from get_contact_info(1, 1);                   -- user 1 là chủ bài LOST số 1 -> có kết quả
select * from get_contact_info(5, 1);                   -- người khác -> 0 dòng
select * from get_notifications(1, false);
select notify_candidate(22);                            -- lần 1 trả notification_id, lần 2 trả NULL (chống trùng)
-- Đăng bài thử (giống hệt nút "Gửi tin đăng"); trả về post_id và report_code:
select * from create_post(
   p_user_id => 1, p_post_type => 'LOST', p_species => 'DOG',
   p_description => 'Chó bị lạc gần công viên, có vòng cổ đỏ',
   p_event_time => now() - interval '2 hours', p_location_text => 'Công viên Tao Đàn, Quận 1, TP.HCM',    p_image_paths => array['uploads/demo1.jpg', 'uploads/demo2.jpg'], p_cover_index => 1,
   p_gender => 'MALE', p_breed => 'Poodle', p_coat_color => 'Trắng',
   p_latitude => 10.7769, p_longitude => 106.6926);
-- Các thao tác làm thay đổi dữ liệu seed (chạy xong dữ liệu sẽ khác ban đầu):
select * from contact_candidate(1, 1);
select reject_candidate(1, 1);
select resolve_lost_post(2, 3, null, 4);                -- user 2 xác nhận tìm thấy nhờ bài FOUND (gợi ý số 4)
select resolve_lost_post(3, 5, 'SELF_FOUND');            -- user 3 xác nhận tìm thấy nhờ nguồn khác
select cancel_post(4, 7);                                -- user 4 hủy bài LOST số 7
