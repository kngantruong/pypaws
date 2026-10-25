create database Lost_FoundDB
go
use Lost_FoundDB
go

create table users (
    user_id int identity(1,1) primary key,
    email nvarchar(255) not null unique,
    password nvarchar(255) not null,            -- chỉ lưu hash
    full_name nvarchar(100) null,
    phone nvarchar(20) null,
    user_type varchar(15) not null default 'INDIVIDUAL'
        check (user_type in ('INDIVIDUAL','SHELTER','ADMIN')),
    created_at datetime2 not null default sysutcdatetime()
)
go

create table posts (
    post_id int identity(1,1) primary key,
    user_id int not null,
    post_type varchar(10) not null check (post_type in ('LOST','FOUND')),
    species varchar(10) not null check (species in ('DOG','CAT')),
    description nvarchar(max) null,
    event_time datetime2 null,
    latitude decimal(9,6) null,
    longitude decimal(9,6) null,
    status varchar(20) not null default 'ACTIVE'
        check (status in ('ACTIVE','MATCHED','CLOSED','EXPIRED')),
    location_text nvarchar(255) null,
    data_source varchar(10) not null default 'USER'
        check (data_source in ('USER','PETFACE')),
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_posts_users foreign key (user_id) references users(user_id),
    constraint CK_posts_latlng check (
        (latitude is null and longitude is null)
        or (latitude between -90 and 90 and longitude between -180 and 180)
    )
)
go

create table post_images (
    image_id int identity(1,1) primary key,
    post_id int not null,
    image_path nvarchar(500) not null,
    is_primary bit not null default 0,
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_post_images_posts foreign key (post_id)
        references posts(post_id) on delete cascade
)
go
-- mỗi bài đăng tối đa 1 ảnh đại diện
create unique index UX_post_images_primary on post_images(post_id) where is_primary = 1
go

create table image_embeddings (
    image_id int not null,
    model_name varchar(50) not null
        check (model_name in ('dinov2_pretrained','dinov2_finetuned')),
    model_version varchar(50) not null,
    embedding varbinary(max) not null,
    dim smallint not null check (dim > 0),
    dtype varchar(10) not null default 'float32' check (dtype = 'float32'),
    created_at datetime2 not null default sysutcdatetime(),
    constraint PK_image_embeddings primary key (image_id, model_name, model_version),
    constraint FK_emb_images foreign key (image_id)
        references post_images(image_id) on delete cascade
)
go

create table candidates (
    candidate_id int identity(1,1) primary key,
    query_post_id int not null,
    candidate_post_id int not null,
    image_score decimal(7,5) null,
    distance_km decimal(9,2) null,
    time_gap_hours decimal(10,2) null,
    final_score decimal(7,5) not null,
    rank_no int not null check (rank_no >= 1),
    passed_threshold bit not null,
    reason nvarchar(500) null,
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_cand_query foreign key (query_post_id) references posts(post_id),
    constraint FK_cand_cand foreign key (candidate_post_id) references posts(post_id),
    constraint CK_cand_diff check (query_post_id <> candidate_post_id)
)
go

create table adopt_pets (
    pet_id int identity(1,1) primary key,
    user_id int not null,
    pet_name nvarchar(100) null,
    species varchar(10) not null check (species in ('DOG','CAT')),
    breed nvarchar(100) null,
    sex varchar(10) not null default 'UNKNOWN' check (sex in ('MALE','FEMALE','UNKNOWN')),
    age_months int null check (age_months >= 0),
    size varchar(10) null check (size in ('SMALL','MEDIUM','LARGE')),
    coat_color nvarchar(50) null,
    appearance_notes nvarchar(300) null,
    temperament nvarchar(200) null,
    health_status nvarchar(500) null,
    is_vaccinated bit null,
    is_neutered bit null,
    requires_special_care bit not null default 0,
    special_care_notes nvarchar(500) null,
    good_with_kids bit null,
    good_with_pets bit null,
    housing_requirement varchar(15) not null default 'ANY'
        check (housing_requirement in ('ANY','HOUSE','APARTMENT')),
    city nvarchar(100) null,
    status varchar(10) not null default 'AVAILABLE'
        check (status in ('AVAILABLE','PENDING','ADOPTED','CLOSED')),
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_adopt_pets_users foreign key (user_id) references users(user_id)
)
go

create table adopt_pet_images (
    pet_image_id int identity(1,1) primary key,
    pet_id int not null,
    image_path nvarchar(500) not null,
    is_primary bit not null default 0,
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_adopt_img_pets foreign key (pet_id)
        references adopt_pets(pet_id) on delete cascade
)
go
create unique index UX_adopt_img_primary on adopt_pet_images(pet_id) where is_primary = 1
go

create table adopters (
    adopter_id int identity(1,1) primary key,
    user_id int not null unique,
    preferred_species varchar(10) not null default 'ANY'
        check (preferred_species in ('DOG','CAT','ANY')),
    preferred_size varchar(10) not null default 'ANY'
        check (preferred_size in ('SMALL','MEDIUM','LARGE','ANY')),
    preferred_energy varchar(10) not null default 'ANY'
        check (preferred_energy in ('LOW','MEDIUM','HIGH','ANY')),
    preferred_sex varchar(10) not null default 'ANY'
        check (preferred_sex in ('MALE','FEMALE','ANY')),
    preferred_age_min_months int null,
    preferred_age_max_months int null,
    housing_type varchar(15) null check (housing_type in ('HOUSE','APARTMENT','OTHER')),
    has_children bit null,
    has_other_pets bit null,
    experience_level varchar(12) null check (experience_level in ('NONE','BEGINNER','EXPERIENCED')),
    daily_care_hours decimal(4,1) null check (daily_care_hours between 0 and 24),
    can_handle_special_care bit null,
    city nvarchar(100) null,
    notes nvarchar(500) null,
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_adopters_users foreign key (user_id) references users(user_id),
    constraint CK_adopters_age check (
        preferred_age_min_months is null or preferred_age_max_months is null
        or preferred_age_min_months <= preferred_age_max_months)
)
go

create table adoption_requests (
    request_id int identity(1,1) primary key,
    adopter_id int not null,
    pet_id int not null,
    message nvarchar(500) null,
    status varchar(15) not null default 'PENDING'
        check (status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_req_adopters foreign key (adopter_id) references adopters(adopter_id),
    constraint FK_req_pets foreign key (pet_id) references adopt_pets(pet_id),
    constraint UQ_req_pair unique (adopter_id, pet_id)
)
go

create table notifications (
    notification_id int identity(1,1) primary key,
    user_id int not null,
    notification_type varchar(30) not null,
    title nvarchar(200) not null,
    message nvarchar(1000) not null,
    related_candidate_id int null,
    is_read bit not null default 0,
    created_at datetime2 not null default sysutcdatetime(),
    constraint FK_notif_users foreign key (user_id) references users(user_id),
    constraint FK_notif_cand foreign key (related_candidate_id) references candidates(candidate_id)
)
go

-- Index phục vụ các truy vấn chính
create index IX_posts_type_species_status on posts(post_type, species, status) include (event_time, latitude, longitude)
create index IX_posts_user on posts(user_id)
create index IX_post_images_post on post_images(post_id)
create unique index UX_cand_pair on candidates(query_post_id, candidate_post_id)
create index IX_cand_query_rank on candidates(query_post_id, rank_no)
create index IX_notif_user_unread on notifications(user_id, is_read, created_at desc)
create index IX_adopt_pets_filter on adopt_pets(status, species, city)
create index IX_req_pet on adoption_requests(pet_id, status)
go