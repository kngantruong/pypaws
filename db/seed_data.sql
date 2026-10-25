use Lost_FoundDB
go


set identity_insert users on
insert into users (user_id,email,password,full_name,phone,user_type) values
(1,'an.nguyen@example.com','$2b$12$PLACEHOLDER_HASH_1',N'Nguyễn Văn An','0901000001','INDIVIDUAL'),
(2,'binh.tran@example.com','$2b$12$PLACEHOLDER_HASH_2',N'Trần Thị Bình','0901000002','INDIVIDUAL'),
(3,'chi.le@example.com','$2b$12$PLACEHOLDER_HASH_3',N'Lê Minh Chi','0901000003','INDIVIDUAL'),
(4,'dung.pham@example.com','$2b$12$PLACEHOLDER_HASH_4',N'Phạm Quốc Dũng','0901000004','INDIVIDUAL'),
(5,'em.vo@example.com','$2b$12$PLACEHOLDER_HASH_5',N'Võ Thanh Em','0901000005','INDIVIDUAL'),
(6,'phuc.do@example.com','$2b$12$PLACEHOLDER_HASH_6',N'Đỗ Hoàng Phúc','0901000006','INDIVIDUAL'),
(7,'shelter.hcm@example.com','$2b$12$PLACEHOLDER_HASH_7',N'Trạm cứu hộ thú cưng HCM','0901000007','SHELTER'),
(8,'admin@example.com','$2b$12$PLACEHOLDER_HASH_8',N'Quản trị viên','0901000008','ADMIN');
set identity_insert users off
go

set identity_insert posts on
insert into posts (post_id,user_id,post_type,species,description,event_time,latitude,longitude,status,location_text,data_source) values
(1,1,'LOST','CAT',N'Mất mèo. Đi lạc khi cửa nhà mở, quen người, có đeo vòng cổ.','2026-10-04T23:00:00',10.774777,106.701625,'ACTIVE',N'Phường Bến Nghé, Quận 1, TP.HCM','PETFACE'),
(2,5,'FOUND','CAT',N'Nhặt được mèo. Nhặt được gần chợ, trông khỏe mạnh, đang tạm giữ ở nhà.','2026-10-06T21:00:00',10.766262,106.707532,'ACTIVE',N'Phường Bến Nghé, Quận 1, TP.HCM','PETFACE'),
(3,2,'LOST','CAT',N'Mất mèo. Chạy ra khỏi nhà lúc đi dạo, hơi nhút nhát.','2026-10-06T15:00:00',10.785957,106.685289,'ACTIVE',N'Phường Võ Thị Sáu, Quận 3, TP.HCM','PETFACE'),
(4,6,'FOUND','CAT',N'Nhặt được mèo. Thấy đi lang thang một mình, thân thiện với người lạ.','2026-10-06T21:00:00',10.776419,106.68271,'ACTIVE',N'Phường Võ Thị Sáu, Quận 3, TP.HCM','PETFACE'),
(5,3,'LOST','CAT',N'Mất mèo. Mất tích sau buổi tối mưa lớn, rất quen tên gọi.','2026-10-07T23:00:00',10.809946,106.711578,'ACTIVE',N'Phường 25, Quận Bình Thạnh, TP.HCM','PETFACE'),
(6,5,'FOUND','CAT',N'Nhặt được mèo. Phát hiện trước cổng chung cư, có vẻ từng được nuôi.','2026-10-10T02:00:00',10.806071,106.691622,'ACTIVE',N'Phường 7, Quận Phú Nhuận, TP.HCM','PETFACE'),
(7,4,'LOST','CAT',N'Mất mèo. Thoát khỏi lồng khi di chuyển, chưa gắn microchip.','2026-10-09T08:00:00',10.802353,106.6783,'ACTIVE',N'Phường 7, Quận Phú Nhuận, TP.HCM','PETFACE'),
(8,6,'FOUND','CAT',N'Nhặt được mèo. Tìm thấy dưới mưa, đã cho ăn và uống nước.','2026-10-11T06:00:00',10.790306,106.682639,'ACTIVE',N'Phường 7, Quận Phú Nhuận, TP.HCM','PETFACE'),
(9,1,'LOST','CAT',N'Mất mèo. Biến mất sau khi cổng nhà bị hỏng, ăn uống bình thường.','2026-10-11T02:00:00',10.836754,106.665806,'ACTIVE',N'Phường 10, Quận Gò Vấp, TP.HCM','PETFACE'),
(10,5,'FOUND','CAT',N'Nhặt được mèo. Gặp ở vỉa hè, không có vòng cổ, đang gửi tạm.','2026-10-12T05:00:00',10.827329,106.670888,'ACTIVE',N'Phường 10, Quận Gò Vấp, TP.HCM','PETFACE'),
(11,2,'LOST','CAT',N'Mất mèo. Lạc khi đi cùng chủ ở công viên, có sẹo nhỏ trên tai.','2026-10-12T16:00:00',10.798695,106.649216,'ACTIVE',N'Phường 4, Quận Tân Bình, TP.HCM','PETFACE'),
(12,6,'FOUND','CAT',N'Nhặt được mèo. Nhặt được gần công viên, chưa thấy ai nhận.','2026-10-14T06:00:00',10.837585,106.756104,'ACTIVE',N'Phường Linh Trung, TP. Thủ Đức, TP.HCM','PETFACE'),
(13,3,'LOST','DOG',N'Mất chó. Đi lạc khi cửa nhà mở, quen người, có đeo vòng cổ.','2026-10-14T04:00:00',10.851675,106.756228,'ACTIVE',N'Phường Linh Trung, TP. Thủ Đức, TP.HCM','PETFACE'),
(14,5,'FOUND','DOG',N'Nhặt được chó. Nhặt được gần chợ, trông khỏe mạnh, đang tạm giữ ở nhà.','2026-10-15T04:00:00',10.847563,106.762036,'ACTIVE',N'Phường Linh Trung, TP. Thủ Đức, TP.HCM','PETFACE'),
(15,4,'LOST','DOG',N'Mất chó. Chạy ra khỏi nhà lúc đi dạo, hơi nhút nhát.','2026-10-15T11:00:00',10.736742,106.720204,'ACTIVE',N'Phường Tân Phong, Quận 7, TP.HCM','PETFACE'),
(16,6,'FOUND','DOG',N'Nhặt được chó. Thấy đi lang thang một mình, thân thiện với người lạ.','2026-10-15T18:00:00',10.744554,106.719223,'ACTIVE',N'Phường Tân Phong, Quận 7, TP.HCM','PETFACE'),
(17,1,'LOST','DOG',N'Mất chó. Mất tích sau buổi tối mưa lớn, rất quen tên gọi.','2026-10-17T02:00:00',10.773232,106.664724,'ACTIVE',N'Phường 12, Quận 10, TP.HCM','PETFACE'),
(18,5,'FOUND','DOG',N'Nhặt được chó. Phát hiện trước cổng chung cư, có vẻ từng được nuôi.','2026-10-18T20:00:00',10.743797,106.664379,'ACTIVE',N'Phường 9, Quận 5, TP.HCM','PETFACE'),
(19,2,'LOST','DOG',N'Mất chó. Thoát khỏi lồng khi di chuyển, chưa gắn microchip.','2026-10-18T08:00:00',10.753329,106.662364,'ACTIVE',N'Phường 9, Quận 5, TP.HCM','PETFACE'),
(20,6,'FOUND','DOG',N'Nhặt được chó. Tìm thấy dưới mưa, đã cho ăn và uống nước.','2026-10-18T15:00:00',10.760748,106.67507,'ACTIVE',N'Phường 9, Quận 5, TP.HCM','PETFACE'),
(21,3,'LOST','DOG',N'Mất chó. Biến mất sau khi cổng nhà bị hỏng, ăn uống bình thường.','2026-10-19T21:00:00',10.790315,106.62515,'ACTIVE',N'Phường Tân Quý, Quận Tân Phú, TP.HCM','PETFACE'),
(22,5,'FOUND','DOG',N'Nhặt được chó. Gặp ở vỉa hè, không có vòng cổ, đang gửi tạm.','2026-10-22T07:00:00',10.79681,106.638613,'ACTIVE',N'Phường Tân Quý, Quận Tân Phú, TP.HCM','PETFACE'),
(23,4,'LOST','DOG',N'Mất chó. Lạc khi đi cùng chủ ở công viên, có sẹo nhỏ trên tai.','2026-10-21T15:00:00',10.754739,106.700236,'ACTIVE',N'Phường 8, Quận 4, TP.HCM','PETFACE'),
(24,6,'FOUND','DOG',N'Nhặt được chó. Nhặt được gần công viên, chưa thấy ai nhận.','2026-10-23T08:00:00',10.781111,106.707939,'ACTIVE',N'Phường Bến Nghé, Quận 1, TP.HCM','PETFACE');
set identity_insert posts off
go

set identity_insert post_images on
insert into post_images (image_id,post_id,image_path,is_primary) values
(1,1,'cat/145549/00.png',1),
(2,2,'cat/145549/01.png',1),
(3,3,'cat/146208/00.png',1),
(4,4,'cat/146208/01.png',1),
(5,5,'cat/142403/00.png',1),
(6,6,'cat/142403/01.png',1),
(7,7,'cat/142959/00.png',1),
(8,8,'cat/142959/01.png',1),
(9,9,'cat/141204/00.png',1),
(10,10,'cat/141204/01.png',1),
(11,11,'cat/140881/00.png',1),
(12,12,'cat/140881/01.png',1),
(13,13,'dog/069186/00.png',1),
(14,14,'dog/069186/01.png',1),
(15,15,'dog/067381/00.png',1),
(16,16,'dog/067381/01.png',1),
(17,17,'dog/055840/00.png',1),
(18,18,'dog/055840/01.png',1),
(19,19,'dog/064742/00.png',1),
(20,20,'dog/064742/01.png',1),
(21,21,'dog/065426/00.png',1),
(22,22,'dog/065426/01.png',1),
(23,23,'dog/068544/00.png',1),
(24,24,'dog/068544/01.png',1),
(25,1,'cat/145549/01.png',0),
(26,3,'cat/146208/01.png',0);
set identity_insert post_images off
go

-- image_embeddings: KHÔNG seed. Pipeline AI (DINOv2) sẽ sinh vector sau; 26 ảnh trên đều 'chưa có embedding'.

set identity_insert candidates on
insert into candidates (candidate_id,query_post_id,candidate_post_id,image_score,distance_km,time_gap_hours,final_score,rank_no,passed_threshold,reason) values
(1,1,2,0.85219,1.15,46.00,0.82119,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(2,1,6,0.55578,3.65,123.00,0.55258,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(3,1,8,0.51782,2.70,151.00,0.53549,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(4,3,4,0.87818,1.10,6.00,0.89542,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(5,3,8,0.50486,0.56,111.00,0.54777,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(6,3,10,0.47679,4.86,134.00,0.48514,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(7,5,6,0.88514,2.22,51.00,0.82655,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(8,5,4,0.57283,4.88,26.00,0.61604,2,1,N'Ảnh tương đối giống, cần xác minh thêm'),
(9,5,2,0.45591,4.88,26.00,0.53425,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(10,7,10,0.68195,2.89,69.00,0.65260,1,1,N'Ảnh tương đối giống, cần xác minh thêm'),
(11,7,8,0.61098,1.42,46.00,0.64959,2,1,N'Ảnh tương đối giống, cần xác minh thêm'),
(12,7,12,0.49505,9.36,118.00,0.45297,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(13,9,10,0.84376,1.19,27.00,0.84127,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(14,9,4,0.55369,6.96,101.00,0.51800,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(15,9,2,0.33735,9.07,101.00,0.34548,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(16,11,12,0.92667,12.45,38.00,0.77140,1,1,N'Ảnh khá giống nhau'),
(17,11,10,0.46186,3.97,11.00,0.56835,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(18,11,2,0.55887,7.32,139.00,0.51801,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(19,13,14,0.92290,0.78,24.00,0.90488,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(20,13,22,0.48309,14.22,195.00,0.39595,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(21,13,20,0.40363,13.45,107.00,0.34808,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(22,15,16,0.81509,0.88,7.00,0.85209,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(23,15,22,0.57111,11.14,164.00,0.48840,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(24,15,14,0.43431,13.14,7.00,0.46287,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(25,17,20,0.69607,1.79,37.00,0.71796,1,1,N'Ảnh tương đối giống, cần xác minh thêm'),
(26,17,18,0.63575,3.27,42.00,0.65396,2,1,N'Ảnh tương đối giống, cần xác minh thêm'),
(27,17,16,0.41272,6.75,32.00,0.47692,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(28,19,20,0.93925,1.61,7.00,0.93161,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(29,19,16,0.35740,6.29,62.00,0.40119,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(30,19,14,0.33147,15.11,76.00,0.28093,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(31,21,22,0.81009,1.64,58.00,0.77013,1,1,N'Ảnh khá giống, địa điểm gần nhau'),
(32,21,18,0.43320,6.72,25.00,0.50135,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(33,21,16,0.39309,11.47,99.00,0.36050,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(34,23,24,0.83592,3.05,41.00,0.79769,1,1,N'Ảnh khá giống nhau'),
(35,23,20,0.57352,2.83,72.00,0.57317,2,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất'),
(36,23,16,0.45648,2.36,141.00,0.49590,3,0,N'Điểm tương đồng thấp, chưa đạt ngưỡng đề xuất');
set identity_insert candidates off
go

--  final = 0.7*ảnh + 0.2*gần + 0.1*thời gian, ngưỡng đề xuất 0.60

insert into notifications (user_id,notification_type,title,message,related_candidate_id,is_read) values
(1,'CANDIDATE_FOUND',N'Có bài đăng có thể là thú cưng của bạn',N'Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',1,1),
(2,'CANDIDATE_FOUND',N'Có bài đăng có thể là thú cưng của bạn',N'Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',4,0),
(3,'CANDIDATE_FOUND',N'Có bài đăng có thể là thú cưng của bạn',N'Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',7,0),
(4,'CANDIDATE_FOUND',N'Có bài đăng có thể là thú cưng của bạn',N'Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',10,1),
(1,'CANDIDATE_FOUND',N'Có bài đăng có thể là thú cưng của bạn',N'Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',13,0),
(2,'CANDIDATE_FOUND',N'Có bài đăng có thể là thú cưng của bạn',N'Hệ thống tìm thấy một bài FOUND có độ tương đồng cao. Hãy xem chi tiết để xác minh.',16,0);
go

set identity_insert adopt_pets on
insert into adopt_pets (pet_id,user_id,pet_name,species,sex,age_months,size,temperament,health_status,is_vaccinated,is_neutered,requires_special_care,good_with_kids,good_with_pets,housing_requirement,city,status) values
(1,7,N'Mướp','CAT','FEMALE',6,'SMALL',N'Hiền, thân thiện',N'Khỏe mạnh',1,0,0,1,NULL,'ANY',N'TP.HCM','AVAILABLE'),
(2,7,N'Bông','CAT','UNKNOWN',12,'SMALL',N'Hiền, thân thiện',N'Khỏe mạnh',0,0,0,NULL,1,'ANY',N'TP.HCM','AVAILABLE'),
(3,7,N'Tom','CAT','MALE',24,'SMALL',N'Hiền, thân thiện',N'Khỏe mạnh',1,1,0,1,NULL,'APARTMENT',N'TP.HCM','AVAILABLE'),
(4,7,N'Lu','DOG','FEMALE',8,'MEDIUM',N'Hiền, thân thiện',N'Khỏe mạnh',0,0,0,NULL,1,'ANY',N'TP.HCM','AVAILABLE'),
(5,7,N'Bi','DOG','UNKNOWN',18,'LARGE',N'Hiền, thân thiện',N'Khỏe mạnh',1,0,0,1,NULL,'HOUSE',N'TP.HCM','ADOPTED'),
(6,7,N'Vàng','DOG','MALE',36,'MEDIUM',N'Hiền, thân thiện',N'Khỏe mạnh',0,1,0,NULL,1,'ANY',N'TP.HCM','AVAILABLE');
set identity_insert adopt_pets off
go

-- Giống (breed), màu lông, ngoại hình để NULL: sẽ do Qwen trích xuất từ ảnh.

insert into adopt_pet_images (pet_id,image_path,is_primary) values
(1,'cat/142163/00.png',1),
(1,'cat/142163/01.png',0),
(2,'cat/159499/00.png',1),
(2,'cat/159499/01.png',0),
(3,'cat/152152/00.png',1),
(3,'cat/152152/01.png',0),
(4,'dog/062145/00.png',1),
(4,'dog/062145/01.png',0),
(5,'dog/063324/00.png',1),
(5,'dog/063324/01.png',0),
(6,'dog/055345/00.png',1),
(6,'dog/055345/01.png',0);
go

insert into adopters (user_id,preferred_species,preferred_size,preferred_energy,preferred_sex,preferred_age_min_months,preferred_age_max_months,housing_type,has_children,has_other_pets,experience_level,daily_care_hours,can_handle_special_care,city,notes) values
(2,'CAT','SMALL','LOW','ANY',3,24,'APARTMENT',0,0,'BEGINNER',3.5,0,N'TP.HCM',N'Muốn nuôi mèo nhỏ, sống ở chung cư'),
(3,'DOG','MEDIUM','MEDIUM','ANY',6,36,'HOUSE',1,1,'EXPERIENCED',5.0,1,N'TP.HCM',N'Nhà có sân, có trẻ nhỏ'),
(4,'ANY','ANY','ANY','ANY',NULL,NULL,'APARTMENT',NULL,NULL,'NONE',2.0,NULL,N'TP.HCM',NULL);
go

insert into adoption_requests (adopter_id,pet_id,message,status) values
(1,1,N'Mình muốn nhận nuôi bé Mướp, nhà có ban công an toàn.','PENDING'),
(1,2,N'Mình quan tâm bé Bông.','CANCELLED'),
(2,5,N'Nhà mình có sân rộng, có kinh nghiệm nuôi chó lớn.','APPROVED'),
(3,4,N'Mình muốn nhận nuôi bé Lu.','REJECTED');
go

select 'users' t,count(*) n from users union all select 'posts',count(*) from posts union all select 'post_images',count(*) from post_images union all select 'candidates',count(*) from candidates union all select 'notifications',count(*) from notifications union all select 'adopt_pets',count(*) from adopt_pets union all select 'adopt_pet_images',count(*) from adopt_pet_images union all select 'adopters',count(*) from adopters union all select 'adoption_requests',count(*) from adoption_requests
go