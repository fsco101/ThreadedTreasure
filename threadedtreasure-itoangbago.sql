-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 05, 2025 at 04:54 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `threadedtreasure`
--

-- --------------------------------------------------------

--
-- Stand-in structure for view `active_users`
-- (See below for the actual view)
--
CREATE TABLE `active_users` (
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `admin_users`
-- (See below for the actual view)
--
CREATE TABLE `admin_users` (
);

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--
-- Error reading structure for table threadedtreasure.categories: #1932 - Table &#039;threadedtreasure.categories&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.categories: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`categories`&#039; at line 1

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--
-- Error reading structure for table threadedtreasure.inventory: #1932 - Table &#039;threadedtreasure.inventory&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.inventory: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`inventory`&#039; at line 1

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--
-- Error reading structure for table threadedtreasure.orders: #1932 - Table &#039;threadedtreasure.orders&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.orders: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`orders`&#039; at line 1

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--
-- Error reading structure for table threadedtreasure.order_items: #1932 - Table &#039;threadedtreasure.order_items&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.order_items: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`order_items`&#039; at line 1

-- --------------------------------------------------------

--
-- Table structure for table `products`
--
-- Error reading structure for table threadedtreasure.products: #1932 - Table &#039;threadedtreasure.products&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.products: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`products`&#039; at line 1

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--
-- Error reading structure for table threadedtreasure.product_images: #1932 - Table &#039;threadedtreasure.product_images&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.product_images: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`product_images`&#039; at line 1

-- --------------------------------------------------------

--
-- Stand-in structure for view `recent_users`
-- (See below for the actual view)
--
CREATE TABLE `recent_users` (
);

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--
-- Error reading structure for table threadedtreasure.reviews: #1932 - Table &#039;threadedtreasure.reviews&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.reviews: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`reviews`&#039; at line 1

-- --------------------------------------------------------

--
-- Table structure for table `shopping_cart`
--
-- Error reading structure for table threadedtreasure.shopping_cart: #1932 - Table &#039;threadedtreasure.shopping_cart&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.shopping_cart: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`shopping_cart`&#039; at line 1

-- --------------------------------------------------------

--
-- Table structure for table `users`
--
-- Error reading structure for table threadedtreasure.users: #1932 - Table &#039;threadedtreasure.users&#039; doesn&#039;t exist in engine
-- Error reading data for table threadedtreasure.users: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;FROM `threadedtreasure`.`users`&#039; at line 1

-- --------------------------------------------------------

--
-- Stand-in structure for view `user_statistics`
-- (See below for the actual view)
--
CREATE TABLE `user_statistics` (
);

-- --------------------------------------------------------

--
-- Structure for view `active_users`
--
DROP TABLE IF EXISTS `active_users`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `active_users`  AS SELECT `users`.`id` AS `id`, `users`.`name` AS `name`, `users`.`email` AS `email`, `users`.`phone` AS `phone`, `users`.`role` AS `role`, `users`.`last_login` AS `last_login`, `users`.`created_at` AS `created_at` FROM `users` WHERE `users`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `admin_users`
--
DROP TABLE IF EXISTS `admin_users`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `admin_users`  AS SELECT `users`.`id` AS `id`, `users`.`name` AS `name`, `users`.`email` AS `email`, `users`.`phone` AS `phone`, `users`.`last_login` AS `last_login`, `users`.`created_at` AS `created_at` FROM `users` WHERE `users`.`role` = 'admin' AND `users`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `recent_users`
--
DROP TABLE IF EXISTS `recent_users`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `recent_users`  AS SELECT `users`.`id` AS `id`, `users`.`name` AS `name`, `users`.`email` AS `email`, `users`.`role` AS `role`, `users`.`is_active` AS `is_active`, `users`.`created_at` AS `created_at` FROM `users` WHERE `users`.`created_at` >= current_timestamp() - interval 30 day ORDER BY `users`.`created_at` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `user_statistics`
--
DROP TABLE IF EXISTS `user_statistics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `user_statistics`  AS SELECT count(0) AS `total_users`, sum(case when `users`.`role` = 'admin' then 1 else 0 end) AS `admin_users`, sum(case when `users`.`role` in ('customer','user') then 1 else 0 end) AS `regular_users`, sum(case when `users`.`is_active` = 1 then 1 else 0 end) AS `active_users`, sum(case when `users`.`is_active` = 0 then 1 else 0 end) AS `inactive_users`, sum(case when `users`.`newsletter_subscribed` = 1 then 1 else 0 end) AS `newsletter_subscribers`, sum(case when `users`.`email_verified` = 1 then 1 else 0 end) AS `verified_emails`, sum(case when `users`.`last_login` is not null then 1 else 0 end) AS `users_who_logged_in`, sum(case when `users`.`created_at` >= current_timestamp() - interval 30 day then 1 else 0 end) AS `new_users_last_30_days`, sum(case when `users`.`last_login` >= current_timestamp() - interval 30 day then 1 else 0 end) AS `active_users_last_30_days` FROM `users` ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
