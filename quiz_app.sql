/*
SQLyog Community v13.2.1 (64 bit)
MySQL - 8.0.30 : Database - quiz_app
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`quiz_app` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `quiz_app`;

/*Table structure for table `answer_options` */

DROP TABLE IF EXISTS `answer_options`;

CREATE TABLE `answer_options` (
  `answer_option_id` int NOT NULL AUTO_INCREMENT,
  `answer_id` int NOT NULL,
  `option_id` int NOT NULL,
  PRIMARY KEY (`answer_option_id`),
  KEY `answer_id` (`answer_id`),
  KEY `option_id` (`option_id`),
  CONSTRAINT `answer_options_ibfk_1` FOREIGN KEY (`answer_id`) REFERENCES `answers` (`answer_id`) ON DELETE CASCADE,
  CONSTRAINT `answer_options_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `options` (`option_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `answer_options` */

insert  into `answer_options`(`answer_option_id`,`answer_id`,`option_id`) values 
(59,67,54),
(60,69,54),
(61,71,57),
(62,73,57),
(63,73,56),
(64,73,55),
(65,73,54),
(66,75,54);

/*Table structure for table `answers` */

DROP TABLE IF EXISTS `answers`;

CREATE TABLE `answers` (
  `answer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `question_id` int NOT NULL,
  `history_id` int NOT NULL,
  `answer_text` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`answer_id`),
  KEY `idx_answers_user_id` (`user_id`),
  KEY `idx_answers_quiz_id` (`quiz_id`),
  KEY `idx_answers_question_id` (`question_id`),
  KEY `idx_answers_history_id` (`history_id`),
  KEY `idx_answers_submitted_at` (`submitted_at`),
  CONSTRAINT `answers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `answers_ibfk_2` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `answers_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`) ON DELETE CASCADE,
  CONSTRAINT `answers_ibfk_4` FOREIGN KEY (`history_id`) REFERENCES `history` (`history_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `answers` */

insert  into `answers`(`answer_id`,`user_id`,`quiz_id`,`question_id`,`history_id`,`answer_text`,`submitted_at`) values 
(67,1,10,17,34,NULL,'2024-11-18 16:51:03'),
(68,1,10,18,34,'erer','2024-11-18 16:51:03'),
(69,9,10,17,35,NULL,'2024-11-18 17:04:27'),
(70,9,10,18,35,'nnnnnn','2024-11-18 17:04:27'),
(71,12,10,17,36,NULL,'2024-11-18 17:07:18'),
(72,12,10,18,36,'333','2024-11-18 17:07:18'),
(73,1,10,17,37,NULL,'2024-11-18 17:21:54'),
(74,1,10,18,37,'eee','2024-11-18 17:21:54'),
(75,13,10,17,38,NULL,'2024-11-18 17:22:47'),
(76,13,10,18,38,'eeee','2024-11-18 17:22:47');

/*Table structure for table `essay_reviews` */

DROP TABLE IF EXISTS `essay_reviews`;

CREATE TABLE `essay_reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `answer_id` int NOT NULL,
  `reviewed_by` int NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `reviewed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `answer_id` (`answer_id`),
  KEY `reviewed_by` (`reviewed_by`),
  CONSTRAINT `essay_reviews_ibfk_1` FOREIGN KEY (`answer_id`) REFERENCES `answers` (`answer_id`) ON DELETE CASCADE,
  CONSTRAINT `essay_reviews_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `essay_reviews` */

insert  into `essay_reviews`(`review_id`,`answer_id`,`reviewed_by`,`score`,`feedback`,`reviewed_at`) values 
(14,68,4,50.00,'','2024-11-18 16:51:55'),
(15,72,4,100.00,'','2024-11-18 17:21:17'),
(16,76,4,75.00,'','2024-11-18 17:23:12');

/*Table structure for table `history` */

DROP TABLE IF EXISTS `history`;

CREATE TABLE `history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `score` decimal(5,2) DEFAULT '0.00',
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` timestamp NULL DEFAULT NULL,
  `mc_score` decimal(5,2) DEFAULT '0.00',
  `essay_score` decimal(5,2) DEFAULT '0.00',
  PRIMARY KEY (`history_id`),
  KEY `idx_history_user_id` (`user_id`),
  KEY `idx_history_quiz_id` (`quiz_id`),
  KEY `idx_history_finished_at` (`finished_at`),
  KEY `idx_history_score` (`score`),
  CONSTRAINT `history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `history_ibfk_2` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `history` */

insert  into `history`(`history_id`,`user_id`,`quiz_id`,`score`,`started_at`,`finished_at`,`mc_score`,`essay_score`) values 
(34,1,10,75.00,'2024-11-18 16:51:03','2024-11-18 16:51:03',100.00,50.00),
(35,9,10,100.00,'2024-11-18 17:04:27','2024-11-18 17:04:27',100.00,0.00),
(36,12,10,50.00,'2024-11-18 17:07:18','2024-11-18 17:07:18',0.00,100.00),
(37,1,10,0.00,'2024-11-18 17:21:54','2024-11-18 17:21:54',0.00,0.00),
(38,13,10,87.50,'2024-11-18 17:22:47','2024-11-18 17:22:47',100.00,75.00);

/*Table structure for table `options` */

DROP TABLE IF EXISTS `options`;

CREATE TABLE `options` (
  `option_id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `option_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`option_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `options` */

insert  into `options`(`option_id`,`question_id`,`option_text`,`is_correct`,`created_at`,`updated_at`) values 
(54,17,'1',1,'2024-11-18 16:50:39','2024-11-18 16:50:39'),
(55,17,'2',0,'2024-11-18 16:50:39','2024-11-18 16:50:39'),
(56,17,'3',0,'2024-11-18 16:50:39','2024-11-18 16:50:39'),
(57,17,'4',0,'2024-11-18 16:50:39','2024-11-18 16:50:39'),
(58,19,'ets',1,'2024-11-18 17:29:23','2024-11-18 17:29:23'),
(59,19,'e',0,'2024-11-18 17:29:23','2024-11-18 17:29:23');

/*Table structure for table `questions` */

DROP TABLE IF EXISTS `questions`;

CREATE TABLE `questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `question_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('multiple_choice','essay') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `idx_questions_quiz_id` (`quiz_id`),
  KEY `idx_questions_created_at` (`created_at`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `questions` */

insert  into `questions`(`question_id`,`quiz_id`,`question_text`,`question_type`,`created_at`,`updated_at`) values 
(17,10,'tesss 1','multiple_choice','2024-11-18 16:50:39','2024-11-18 16:50:39'),
(18,10,'erer','essay','2024-11-18 16:50:44','2024-11-18 16:50:44'),
(19,11,'tes','multiple_choice','2024-11-18 17:29:23','2024-11-18 17:29:23'),
(20,10,'AAAAAAAAA','essay','2024-12-12 08:52:30','2024-12-12 08:52:36');

/*Table structure for table `quizzes` */

DROP TABLE IF EXISTS `quizzes`;

CREATE TABLE `quizzes` (
  `quiz_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`quiz_id`),
  KEY `idx_quizzes_created_by` (`created_by`),
  KEY `idx_quizzes_created_at` (`created_at`),
  CONSTRAINT `quizzes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `quizzes` */

insert  into `quizzes`(`quiz_id`,`title`,`description`,`created_by`,`created_at`,`updated_at`) values 
(10,'tesss','erereeeeeeeeeee',4,'2024-11-18 16:44:55','2024-11-18 16:50:20'),
(11,'erere','33333333',4,'2024-11-18 16:50:26','2024-11-18 16:50:26');

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','user') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `users` */

insert  into `users`(`user_id`,`username`,`password_hash`,`email`,`role`,`created_at`,`updated_at`) values 
(1,'user','$2b$12$V4GZmhnqHvQ6o0FXMujP3.IH8ZZqtvPxS.TS2AHmhE4UZjcyTfBSa','user@gmail.com','user','2024-10-30 15:24:17','2024-10-30 15:24:17'),
(4,'admin','$2b$12$AE6Xvxj9zqeA7lLeR79QWuYE1mjDOW9N9RXqiThqq0296cUnto0bm','admin@gmail.com','admin','2024-11-02 10:12:00','2024-11-17 17:30:42'),
(9,'user1','$2b$12$fkOMgwXLN7.m0jyi7BPVj.NLTr6jDQApWrmsDeZnfthYaIczVexza','user222@gmail.com','user','2024-11-17 17:36:49','2024-11-17 17:36:58'),
(12,'tes','$2b$12$6NqOmc43YUX5wYwW9y/Oae2YdcUSS0TkQc0jiAHIztDVIkFPnfDjK','tes@gmail','user','2024-11-18 17:07:02','2024-11-18 17:07:02'),
(13,'tes1','$2b$12$zXvbzAvTR7.THiSxY2fseubxrxikgwZgO7HJJGXuoXeBsYOgiSKEm','tes1@gmail.com','user','2024-11-18 17:22:37','2024-11-18 17:22:37');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
