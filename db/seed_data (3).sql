-- seed_data.sql | PYPAWS | PostgreSQL
-- Chạy SAU schema.sql, trên database rỗng. 24 bài LOST/FOUND từ ảnh PetFace.
-- Ảnh + quan hệ 'cùng một con' lấy từ PetFace; mô tả, địa điểm, thời gian, điểm số là DỮ LIỆU GIẢ để demo.
-- report_code do trigger tự sinh. breed / coat_color / appearance_notes để NULL (có thể UPDATE tay sau).
-- Dữ liệu có đủ các trạng thái để test: 1 cặp RESOLVED, gợi ý REJECTED / CONTACTED / CANCELLED / PENDING.
set client_encoding to 'UTF8';
begin;

insert into users (user_id,email,password,full_name,phone,user_type) values
(1,'an.nguyen@example.com','$2b$12$PLACEHOLDER_HASH_1','Nguyễn Văn An','0901000001','INDIVIDUAL'),
(2,'binh.tran@example.com','$2b$12$PLACEHOLDER_HASH_2','Trần Thị Bình','0901000002','INDIVIDUAL'),
(3,'chi.le@example.com','$2b$12$PLACEHOLDER_HASH_3','Lê Minh Chi','0901000003','INDIVIDUAL'),
(4,'dung.pham@example.com','$2b$12$PLACEHOLDER_HASH_4','Phạm Quốc Dũng','0901000004','INDIVIDUAL'),
(5,'em.vo@example.com','$2b$12$PLACEHOLDER_HASH_5','Võ Thanh Em','0901000005','INDIVIDUAL'),
(6,'phuc.do@example.com','$2b$12$PLACEHOLDER_HASH_6','Đỗ Hoàng Phúc','0901000006','INDIVIDUAL'),
(7,'shelter.hcm@example.com','$2b$12$PLACEHOLDER_HASH_7','Trạm cứu hộ thú cưng HCM','0901000007','SHELTER'),
(8,'admin@example.com','$2b$12$PLACEHOLDER_HASH_8','Quản trị viên','0901000008','ADMIN');

insert into posts (post_id,user_id,post_type,species,gender,description,event_time,latitude,longitude,status,resolved_at,resolution_source,location_text,data_source,created_at) values
(1,1,'LOST','CAT','UNKNOWN','Mất mèo. Đi lạc khi cửa nhà mở, quen người, có đeo vòng cổ.','2026-10-04 23:00:00+07',10.774777,106.701625,'ACTIVE',NULL,NULL,'Phường Bến Nghé, Quận 1, TP.HCM','PETFACE','2026-10-04 23:30:00+07'),
(2,5,'FOUND','CAT','UNKNOWN','Có mèo đi lạc. Nhặt được gần chợ, trông khỏe mạnh, đang tạm giữ ở nhà.','2026-10-06 21:00:00+07',10.766262,106.707532,'ACTIVE',NULL,NULL,'Phường Bến Nghé, Quận 1, TP.HCM','PETFACE','2026-10-06 21:30:00+07'),
(3,2,'LOST','CAT','UNKNOWN','Mất mèo. Chạy ra khỏi nhà lúc đi dạo, hơi nhút nhát.','2026-10-06 15:00:00+07',10.785957,106.685289,'ACTIVE',NULL,NULL,'Phường Võ Thị Sáu, Quận 3, TP.HCM','PETFACE','2026-10-06 15:30:00+07'),
(4,6,'FOUND','CAT','UNKNOWN','Có mèo đi lạc. Thấy đi lang thang một mình, thân thiện với người lạ.','2026-10-06 21:00:00+07',10.776419,106.68271,'ACTIVE',NULL,NULL,'Phường Võ Thị Sáu, Quận 3, TP.HCM','PETFACE','2026-10-06 21:30:00+07'),
(5,3,'LOST','CAT','UNKNOWN','Mất mèo. Mất tích sau buổi tối mưa lớn, rất quen tên gọi.','2026-10-07 23:00:00+07',10.809946,106.711578,'ACTIVE',NULL,NULL,'Phường 25, Quận Bình Thạnh, TP.HCM','PETFACE','2026-10-07 23:30:00+07'),
(6,5,'FOUND','CAT','UNKNOWN','Có mèo đi lạc. Phát hiện trước cổng chung cư, có vẻ từng được nuôi.','2026-10-10 02:00:00+07',10.806071,106.691622,'ACTIVE',NULL,NULL,'Phường 7, Quận Phú Nhuận, TP.HCM','PETFACE','2026-10-10 02:30:00+07'),
(7,4,'LOST','CAT','UNKNOWN','Mất mèo. Thoát khỏi lồng khi di chuyển, chưa gắn microchip.','2026-10-09 08:00:00+07',10.802353,106.6783,'ACTIVE',NULL,NULL,'Phường 7, Quận Phú Nhuận, TP.HCM','PETFACE','2026-10-09 08:30:00+07'),
(8,6,'FOUND','CAT','UNKNOWN','Có mèo đi lạc. Tìm thấy dưới mưa, đã cho ăn và uống nước.','2026-10-11 06:00:00+07',10.790306,106.682639,'ACTIVE',NULL,NULL,'Phường 7, Quận Phú Nhuận, TP.HCM','PETFACE','2026-10-11 06:30:00+07'),
(9,1,'LOST','CAT','UNKNOWN','Mất mèo. Biến mất sau khi cổng nhà bị hỏng, ăn uống bình thường.','2026-10-11 02:00:00+07',10.836754,106.665806,'ACTIVE',NULL,NULL,'Phường 10, Quận Gò Vấp, TP.HCM','PETFACE','2026-10-11 02:30:00+07'),
(10,5,'FOUND','CAT','UNKNOWN','Có mèo đi lạc. Gặp ở vỉa hè, không có vòng cổ, đang gửi tạm.','2026-10-12 05:00:00+07',10.827329,106.670888,'ACTIVE',NULL,NULL,'Phường 10, Quận Gò Vấp, TP.HCM','PETFACE','2026-10-12 05:30:00+07'),
(11,2,'LOST','CAT','UNKNOWN','Mất mèo. Lạc khi đi cùng chủ ở công viên, có sẹo nhỏ trên tai.','2026-10-12 16:00:00+07',10.798695,106.649216,'ACTIVE',NULL,NULL,'Phường 4, Quận Tân Bình, TP.HCM','PETFACE','2026-10-12 16:30:00+07'),
(12,6,'FOUND','CAT','UNKNOWN','Có mèo đi lạc. Nhặt được gần công viên, chưa thấy ai nhận.','2026-10-14 06:00:00+07',10.837585,106.756104,'ACTIVE',NULL,NULL,'Phường Linh Trung, TP. Thủ Đức, TP.HCM','PETFACE','2026-10-14 06:30:00+07'),
(13,3,'LOST','DOG','UNKNOWN','Mất chó. Đi lạc khi cửa nhà mở, quen người, có đeo vòng cổ.','2026-10-14 04:00:00+07',10.851675,106.756228,'ACTIVE',NULL,NULL,'Phường Linh Trung, TP. Thủ Đức, TP.HCM','PETFACE','2026-10-14 04:30:00+07'),
(14,5,'FOUND','DOG','UNKNOWN','Có chó đi lạc. Nhặt được gần chợ, trông khỏe mạnh, đang tạm giữ ở nhà.','2026-10-15 04:00:00+07',10.847563,106.762036,'ACTIVE',NULL,NULL,'Phường Linh Trung, TP. Thủ Đức, TP.HCM','PETFACE','2026-10-15 04:30:00+07'),
(15,4,'LOST','DOG','UNKNOWN','Mất chó. Chạy ra khỏi nhà lúc đi dạo, hơi nhút nhát.','2026-10-15 11:00:00+07',10.736742,106.720204,'ACTIVE',NULL,NULL,'Phường Tân Phong, Quận 7, TP.HCM','PETFACE','2026-10-15 11:30:00+07'),
(16,6,'FOUND','DOG','UNKNOWN','Có chó đi lạc. Thấy đi lang thang một mình, thân thiện với người lạ.','2026-10-15 18:00:00+07',10.744554,106.719223,'ACTIVE',NULL,NULL,'Phường Tân Phong, Quận 7, TP.HCM','PETFACE','2026-10-15 18:30:00+07'),
(17,1,'LOST','DOG','UNKNOWN','Mất chó. Mất tích sau buổi tối mưa lớn, rất quen tên gọi.','2026-10-17 02:00:00+07',10.773232,106.664724,'ACTIVE',NULL,NULL,'Phường 12, Quận 10, TP.HCM','PETFACE','2026-10-17 02:30:00+07'),
(18,5,'FOUND','DOG','UNKNOWN','Có chó đi lạc. Phát hiện trước cổng chung cư, có vẻ từng được nuôi.','2026-10-18 20:00:00+07',10.743797,106.664379,'ACTIVE',NULL,NULL,'Phường 9, Quận 5, TP.HCM','PETFACE','2026-10-18 20:30:00+07'),
(19,2,'LOST','DOG','UNKNOWN','Mất chó. Thoát khỏi lồng khi di chuyển, chưa gắn microchip.','2026-10-18 08:00:00+07',10.753329,106.662364,'ACTIVE',NULL,NULL,'Phường 9, Quận 5, TP.HCM','PETFACE','2026-10-18 08:30:00+07'),
(20,6,'FOUND','DOG','UNKNOWN','Có chó đi lạc. Tìm thấy dưới mưa, đã cho ăn và uống nước.','2026-10-18 15:00:00+07',10.760748,106.67507,'ACTIVE',NULL,NULL,'Phường 9, Quận 5, TP.HCM','PETFACE','2026-10-18 15:30:00+07'),
(21,3,'LOST','DOG','UNKNOWN','Mất chó. Biến mất sau khi cổng nhà bị hỏng, ăn uống bình thường.','2026-10-19 21:00:00+07',10.790315,106.62515,'ACTIVE',NULL,NULL,'Phường Tân Quý, Quận Tân Phú, TP.HCM','PETFACE','2026-10-19 21:30:00+07'),
(22,5,'FOUND','DOG','UNKNOWN','Có chó đi lạc. Gặp ở vỉa hè, không có vòng cổ, đang gửi tạm.','2026-10-22 07:00:00+07',10.79681,106.638613,'ACTIVE',NULL,NULL,'Phường Tân Quý, Quận Tân Phú, TP.HCM','PETFACE','2026-10-22 07:30:00+07'),
(23,4,'LOST','DOG','UNKNOWN','Mất chó. Lạc khi đi cùng chủ ở công viên, có sẹo nhỏ trên tai.','2026-10-21 15:00:00+07',10.754739,106.700236,'RESOLVED','2026-10-26 09:00:00+07','PYPAWS_MATCH','Phường 8, Quận 4, TP.HCM','PETFACE','2026-10-21 15:30:00+07'),
(24,6,'FOUND','DOG','UNKNOWN','Có chó đi lạc. Nhặt được gần công viên, chưa thấy ai nhận.','2026-10-23 08:00:00+07',10.781111,106.707939,'RESOLVED','2026-10-26 09:00:00+07','PYPAWS_MATCH','Phường Bến Nghé, Quận 1, TP.HCM','PETFACE','2026-10-23 08:30:00+07');

insert into post_images (image_id,post_id,image_path,is_primary,sort_order) values
(1,1,'cat/145549/00.png',true,0),
(2,2,'cat/145549/01.png',true,0),
(3,3,'cat/146208/00.png',true,0),
(4,4,'cat/146208/01.png',true,0),
(5,5,'cat/142403/00.png',true,0),
(6,6,'cat/142403/01.png',true,0),
(7,7,'cat/142959/00.png',true,0),
(8,8,'cat/142959/01.png',true,0),
(9,9,'cat/141204/00.png',true,0),
(10,10,'cat/141204/01.png',true,0),
(11,11,'cat/140881/00.png',true,0),
(12,12,'cat/140881/01.png',true,0),
(13,13,'dog/069186/00.png',true,0),
(14,14,'dog/069186/01.png',true,0),
(15,15,'dog/067381/00.png',true,0),
(16,16,'dog/067381/01.png',true,0),
(17,17,'dog/055840/00.png',true,0),
(18,18,'dog/055840/01.png',true,0),
(19,19,'dog/064742/00.png',true,0),
(20,20,'dog/064742/01.png',true,0),
(21,21,'dog/065426/00.png',true,0),
(22,22,'dog/065426/01.png',true,0),
(23,23,'dog/068544/00.png',true,0),
(24,24,'dog/068544/01.png',true,0),
(25,1,'cat/145549/01.png',false,1),
(26,3,'cat/146208/01.png',false,1);

-- image_embeddings: KHÔNG seed. Pipeline AI (DINOv2) sẽ sinh vector sau.

insert into candidates (candidate_id,query_post_id,candidate_post_id,image_score,distance_km,time_gap_hours,final_score,rank_no,passed_threshold,reason,status,decision_at,resolved_at,resolution_source,created_at) values
(1,1,2,0.85219,1.15,46.00,0.82119,1,true,'Ảnh khá giống, địa điểm gần nhau','PENDING',NULL,NULL,NULL,'2026-10-06 22:00:00+07'),
(2,1,6,0.55578,3.65,123.00,0.55258,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-10 03:00:00+07'),
(3,1,8,0.51782,2.70,151.00,0.53549,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','REJECTED','2026-10-11 10:00:00+07',NULL,NULL,'2026-10-11 07:00:00+07'),
(4,3,4,0.87818,1.10,6.00,0.89542,1,true,'Ảnh khá giống, địa điểm gần nhau','CONTACTED','2026-10-07 01:00:00+07',NULL,NULL,'2026-10-06 22:00:00+07'),
(5,3,8,0.50486,0.56,111.00,0.54777,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-11 07:00:00+07'),
(6,3,10,0.47679,4.86,134.00,0.48514,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-12 06:00:00+07'),
(7,5,6,0.88514,2.22,51.00,0.82655,1,true,'Ảnh khá giống, địa điểm gần nhau','PENDING',NULL,NULL,NULL,'2026-10-10 03:00:00+07'),
(8,5,4,0.57283,4.88,26.00,0.61604,2,true,'Ảnh tương đối giống, cần xác minh thêm','PENDING',NULL,NULL,NULL,'2026-10-08 00:00:00+07'),
(9,5,2,0.45591,4.88,26.00,0.53425,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-08 00:00:00+07'),
(10,7,10,0.68195,2.89,69.00,0.65260,1,true,'Ảnh tương đối giống, cần xác minh thêm','PENDING',NULL,NULL,NULL,'2026-10-12 06:00:00+07'),
(11,7,8,0.61098,1.42,46.00,0.64959,2,true,'Ảnh tương đối giống, cần xác minh thêm','PENDING',NULL,NULL,NULL,'2026-10-11 07:00:00+07'),
(12,7,12,0.49505,9.36,118.00,0.45297,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-14 07:00:00+07'),
(13,9,10,0.84376,1.19,27.00,0.84127,1,true,'Ảnh khá giống, địa điểm gần nhau','PENDING',NULL,NULL,NULL,'2026-10-12 06:00:00+07'),
(14,9,4,0.55369,6.96,101.00,0.51800,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-11 03:00:00+07'),
(15,9,2,0.33735,9.07,101.00,0.34548,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-11 03:00:00+07'),
(16,11,12,0.92667,12.45,38.00,0.77140,1,true,'Ảnh khá giống nhau','PENDING',NULL,NULL,NULL,'2026-10-14 07:00:00+07'),
(17,11,10,0.46186,3.97,11.00,0.56835,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-12 17:00:00+07'),
(18,11,2,0.55887,7.32,139.00,0.51801,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-12 17:00:00+07'),
(19,13,14,0.92290,0.78,24.00,0.90488,1,true,'Ảnh khá giống, địa điểm gần nhau','PENDING',NULL,NULL,NULL,'2026-10-15 05:00:00+07'),
(20,13,22,0.48309,14.22,195.00,0.39595,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-22 08:00:00+07'),
(21,13,20,0.40363,13.45,107.00,0.34808,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-18 16:00:00+07'),
(22,15,16,0.81509,0.88,7.00,0.85209,1,true,'Ảnh khá giống, địa điểm gần nhau','PENDING',NULL,NULL,NULL,'2026-10-15 19:00:00+07'),
(23,15,22,0.57111,11.14,164.00,0.48840,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-22 08:00:00+07'),
(24,15,14,0.43431,13.14,7.00,0.46287,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-15 12:00:00+07'),
(25,17,20,0.69607,1.79,37.00,0.71796,1,true,'Ảnh tương đối giống, cần xác minh thêm','PENDING',NULL,NULL,NULL,'2026-10-18 16:00:00+07'),
(26,17,18,0.63575,3.27,42.00,0.65396,2,true,'Ảnh tương đối giống, cần xác minh thêm','PENDING',NULL,NULL,NULL,'2026-10-18 21:00:00+07'),
(27,17,16,0.41272,6.75,32.00,0.47692,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-17 03:00:00+07'),
(28,19,20,0.93925,1.61,7.00,0.93161,1,true,'Ảnh khá giống, địa điểm gần nhau','PENDING',NULL,NULL,NULL,'2026-10-18 16:00:00+07'),
(29,19,16,0.35740,6.29,62.00,0.40119,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-18 09:00:00+07'),
(30,19,14,0.33147,15.11,76.00,0.28093,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-18 09:00:00+07'),
(31,21,22,0.81009,1.64,58.00,0.77013,1,true,'Ảnh khá giống, địa điểm gần nhau','PENDING',NULL,NULL,NULL,'2026-10-22 08:00:00+07'),
(32,21,18,0.43320,6.72,25.00,0.50135,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-19 22:00:00+07'),
(33,21,16,0.39309,11.47,99.00,0.36050,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','PENDING',NULL,NULL,NULL,'2026-10-19 22:00:00+07'),
(34,23,24,0.83592,3.05,41.00,0.79769,1,true,'Ảnh khá giống nhau','RESOLVED','2026-10-23 12:00:00+07','2026-10-26 09:00:00+07','PYPAWS_MATCH','2026-10-23 09:00:00+07'),
(35,23,20,0.57352,2.83,72.00,0.57317,2,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','CANCELLED',NULL,NULL,NULL,'2026-10-21 16:00:00+07'),
(36,23,16,0.45648,2.36,141.00,0.49590,3,false,'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất','CANCELLED',NULL,NULL,NULL,'2026-10-21 16:00:00+07');
-- Điểm trong candidates là GIẢ: final = 0.7*ảnh + 0.2*gần + 0.1*thời gian, ngưỡng 0.60 (thay bằng công thức thật của nhóm).

-- Thông báo: chỉ cho chủ bài LOST, mỗi gợi ý PENDING một lần, bài LOST còn ACTIVE
insert into notifications (user_id,notification_type,title,message,related_candidate_id,is_read) values
(1,'CANDIDATE_FOUND','Có bài đăng có thể là thú cưng của bạn','Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',1,true),
(3,'CANDIDATE_FOUND','Có bài đăng có thể là thú cưng của bạn','Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',7,false),
(4,'CANDIDATE_FOUND','Có bài đăng có thể là thú cưng của bạn','Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',10,false),
(1,'CANDIDATE_FOUND','Có bài đăng có thể là thú cưng của bạn','Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',13,true),
(2,'CANDIDATE_FOUND','Có bài đăng có thể là thú cưng của bạn','Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',16,false),
(3,'CANDIDATE_FOUND','Có bài đăng có thể là thú cưng của bạn','Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',19,false);

-- Đồng bộ lại bộ đếm tự tăng sau khi chèn ID cố định
select setval(pg_get_serial_sequence('users','user_id'), (select max(user_id) from users));
select setval(pg_get_serial_sequence('posts','post_id'), (select max(post_id) from posts));
select setval(pg_get_serial_sequence('post_images','image_id'), (select max(image_id) from post_images));
select setval(pg_get_serial_sequence('candidates','candidate_id'), (select max(candidate_id) from candidates));
select setval(pg_get_serial_sequence('notifications','notification_id'), (select max(notification_id) from notifications));

commit;

-- Kiểm tra nhanh (kết quả đúng: users 8, posts 24, post_images 26, candidates 36, notifications 6)
select 'users' as bang, count(*) as so_dong from users union all select 'posts',count(*) from posts union all select 'post_images',count(*) from post_images union all select 'candidates',count(*) from candidates union all select 'notifications',count(*) from notifications;
-- Xem mã báo cáo đã được trigger sinh: select post_id, report_code, post_type, status from posts order by post_id;
