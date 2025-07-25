-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 25, 2025 at 01:47 PM
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

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `ActivateUser` (IN `user_id` INT, IN `admin_id` INT, IN `reason` TEXT)   BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Update user status
    UPDATE users SET is_active = 1 WHERE id = user_id;
    
    COMMIT;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ChangeUserRole` (IN `user_id` INT, IN `new_role` VARCHAR(20), IN `admin_id` INT)   BEGIN
    DECLARE old_role VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get current role
    SELECT role INTO old_role FROM users WHERE id = user_id;
    
    -- Update user role
    UPDATE users SET role = new_role WHERE id = user_id;
    
    -- If promoting to admin, ensure account is active
    IF new_role = 'admin' THEN
        UPDATE users SET is_active = 1 WHERE id = user_id;
    END IF;
    
    COMMIT;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `DeactivateUser` (IN `user_id` INT, IN `admin_id` INT, IN `reason` TEXT)   BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Update user status
    UPDATE users SET is_active = 0 WHERE id = user_id;
    
    COMMIT;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `GetUserStatistics` ()   BEGIN
    SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
        SUM(CASE WHEN role IN ('customer', 'user') THEN 1 ELSE 0 END) as regular_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users,
        SUM(CASE WHEN newsletter_subscribed = 1 THEN 1 ELSE 0 END) as newsletter_subscribers,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_last_30_days,
        SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_users_last_30_days
    FROM users;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Stand-in structure for view `active_users`
-- (See below for the actual view)
--
CREATE TABLE `active_users` (
`id` bigint(20) unsigned
,`name` varchar(191)
,`email` varchar(191)
,`phone` varchar(20)
,`role` enum('admin','customer','user')
,`last_login` datetime
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `admin_users`
-- (See below for the actual view)
--
CREATE TABLE `admin_users` (
`id` bigint(20) unsigned
,`name` varchar(191)
,`email` varchar(191)
,`phone` varchar(20)
,`last_login` datetime
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(191) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `image`, `created_at`, `updated_at`) VALUES
(1, 'Men\'s Clothing', 'Stylish and comfortable clothing for men', 'categories/mens-clothing.jpg', '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(2, 'Women\'s Clothing', 'Fashion-forward clothing for women', 'categories/womens-clothing.jpg', '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(3, 'Unisex Clothing', 'Versatile clothing for everyone', 'categories/unisex-clothing.jpg', '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(4, 'Accessories', 'Complete your look with stylish accessories', 'categories/accessories.jpg', '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(5, 'Footwear', 'Comfortable and stylish shoes for all occasions', 'categories/footwear.jpg', '2025-07-12 08:00:00', '2025-07-12 08:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `size` varchar(10) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `product_id`, `size`, `color`, `quantity`, `created_at`, `updated_at`) VALUES
(1, 1, 'M', 'White', 50, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(2, 1, 'M', 'Black', 45, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(3, 1, 'L', 'White', 40, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(4, 2, 'M', 'Black', 25, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(5, 2, 'L', 'Navy', 30, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(6, 6, 'One Size', 'Default', 22222, '2025-07-25 10:41:22', '2025-07-25 10:41:33');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `order_number` varchar(50) NOT NULL,
  `status` enum('pending','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `payment_status` enum('pending','processing','completed','failed','refunded') DEFAULT 'pending',
  `payment_method` varchar(50) DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_name` varchar(191) NOT NULL COMMENT 'Snapshot of product name at order time',
  `size` varchar(10) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `sale_price` decimal(10,2) DEFAULT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `main_image` varchar(191) NOT NULL,
  `sizes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Available sizes: ["XS", "S", "M", "L", "XL"]' CHECK (json_valid(`sizes`)),
  `colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Available colors: ["Red", "Blue", "Black"]' CHECK (json_valid(`colors`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `price`, `sale_price`, `category_id`, `brand`, `main_image`, `sizes`, `colors`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Classic Cotton T-Shirt', 'Comfortable and versatile cotton t-shirt perfect for everyday wear. Made from 100% premium cotton with a relaxed fit.', 29.99, NULL, 1, 'ThreadedTreasure', 'products/classic-cotton-tshirt.jpg', '[\"S\", \"M\", \"L\", \"XL\", \"XXL\"]', '[\"White\", \"Black\", \"Navy\", \"Gray\"]', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(2, 'Elegant Midi Dress', 'Sophisticated midi dress perfect for both casual and formal occasions. Features a flattering A-line silhouette.', 89.99, 69.99, 2, 'ThreadedTreasure', 'products/elegant-midi-dress.jpg', '[\"XS\", \"S\", \"M\", \"L\", \"XL\"]', '[\"Black\", \"Navy\", \"Burgundy\", \"Emerald\"]', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(3, 'Denim Jacket', 'Classic denim jacket with a modern twist. Perfect for layering and adding style to any outfit.', 79.99, NULL, 3, 'ThreadedTreasure', 'products/denim-jacket.jpg', '[\"S\", \"M\", \"L\", \"XL\"]', '[\"Light Blue\", \"Dark Blue\", \"Black\"]', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(4, 'Leather Crossbody Bag', 'Stylish and functional crossbody bag made from genuine leather. Perfect for daily use.', 149.99, 119.99, 4, 'ThreadedTreasure', 'products/leather-crossbody-bag.jpg', '[\"One Size\"]', '[\"Black\", \"Brown\", \"Tan\"]', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(5, 'Canvas Sneakers', 'Comfortable canvas sneakers perfect for casual wear. Features cushioned insole and durable construction.', 59.99, NULL, 5, 'ThreadedTreasure', 'products/canvas-sneakers.jpg', '[\"6\", \"7\", \"8\", \"9\", \"10\", \"11\", \"12\"]', '[\"White\", \"Black\", \"Red\", \"Navy\"]', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(6, '12312313', '22222', 2222.00, NULL, 5, NULL, 'products/product_images-1753440082059-264867655.webp', NULL, NULL, 1, '2025-07-25 10:41:22', '2025-07-25 10:41:33');

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `image_path` varchar(191) NOT NULL,
  `alt_text` varchar(191) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `image_path`, `alt_text`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 1, 'products/classic-cotton-tshirt-front.jpg', 'Classic Cotton T-Shirt Front View', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(2, 1, 'products/classic-cotton-tshirt-back.jpg', 'Classic Cotton T-Shirt Back View', 2, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(3, 2, 'products/elegant-midi-dress-front.jpg', 'Elegant Midi Dress Front View', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(4, 2, 'products/elegant-midi-dress-side.jpg', 'Elegant Midi Dress Side View', 2, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(5, 6, 'products/product_images-1753440082059-264867655.webp', '12312313 - Image 1', 1, '2025-07-25 10:41:22', '2025-07-25 10:41:22'),
(6, 6, 'products/product_images-1753440082061-555920935.webp', '12312313 - Image 2', 2, '2025-07-25 10:41:22', '2025-07-25 10:41:22'),
(7, 6, 'products/product_images-1753440082062-698087275.webp', '12312313 - Image 3', 3, '2025-07-25 10:41:22', '2025-07-25 10:41:22');

-- --------------------------------------------------------

--
-- Stand-in structure for view `recent_users`
-- (See below for the actual view)
--
CREATE TABLE `recent_users` (
`id` bigint(20) unsigned
,`name` varchar(191)
,`email` varchar(191)
,`role` enum('admin','customer','user')
,`is_active` tinyint(1)
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `order_item_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Link to the order item being reviewed',
  `rating` int(11) NOT NULL COMMENT '1-5 stars',
  `title` varchar(191) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 0,
  `is_approved` tinyint(1) NOT NULL DEFAULT 1,
  `helpful_count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shopping_cart`
--

CREATE TABLE `shopping_cart` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL COMMENT 'For guest users',
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `size` varchar(10) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(191) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `profile_photo` varchar(191) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `role` enum('admin','customer','user') NOT NULL DEFAULT 'customer',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `newsletter_subscribed` tinyint(1) NOT NULL DEFAULT 0,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email_verification_token` varchar(255) DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `phone`, `date_of_birth`, `gender`, `profile_photo`, `address`, `role`, `is_active`, `newsletter_subscribed`, `email_verified`, `email_verification_token`, `password_reset_token`, `password_reset_expires`, `last_login`, `remember_token`, `created_at`, `updated_at`) VALUES
(1, 'Admin User', 'admin@threadedtreasure.com', '2025-07-12 08:00:00', '$2b$10$example.hash.here', '+1234567890', NULL, NULL, NULL, NULL, 'admin', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(2, 'John Doe', 'john@example.com', NULL, '$2b$10$example.hash.here', '+1234567890', NULL, NULL, NULL, '123 Main St, City, State 12345', 'customer', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(3, 'Jane Smith', 'jane@example.com', NULL, '$2b$10$example.hash.here', '+1234567891', NULL, NULL, NULL, '456 Oak Ave, City, State 12345', 'customer', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(4, 'Bob Johnson', 'bob@example.com', NULL, '$2b$10$example.hash.here', '+1234567892', NULL, NULL, NULL, '789 Pine Rd, City, State 12345', 'customer', 0, 1, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(5, 'Alice Brown', 'alice@example.com', NULL, '$2b$10$example.hash.here', '+1234567893', NULL, NULL, NULL, '321 Elm St, City, State 12345', 'admin', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(6, 'Charlie Wilson', 'charlie@example.com', NULL, '$2b$10$example.hash.here', '+1234567894', NULL, NULL, NULL, '654 Maple Dr, City, State 12345', 'customer', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(7, 'admin', 'admin@gmail.com', NULL, '$2b$12$kW8qnnBgvtPokHv1Nmrb/OHwWgadbz/4ZsM.8S/5GK3B7GhBqzUjW', '12345678900', NULL, NULL, NULL, 'tyj', 'customer', 1, 0, 0, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInR5cGUiOiJlbWFpbF92ZXJpZmljYXRpb24iLCJpYXQiOjE3NTM0MTM4NTcsImV4cCI6MTc1MzUwMDI1N30.6MrJCAre0WxhIDibzR5mucpF9O_b_JNLwdNAclcrmKY', NULL, NULL, NULL, NULL, '2025-07-25 03:24:17', '2025-07-25 03:24:17'),
(8, 'adminnew', 'adminnew@gmail.com', NULL, '$2b$12$NH4y.45M0a4VtgeY5pFBy.2CCqsnknMj4JYRQ.oXZaPyHaW3w4xbi', '131231312313', NULL, NULL, 'avatar-1753438762268-881665379.webp', 'adminew123', 'admin', 1, 0, 0, NULL, NULL, NULL, '2025-07-25 19:07:43', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwiZW1haWwiOiJhZG1pbm5ld0BnbWFpbC5jb20iLCJyb2xlIjoiYWR', '2025-07-25 03:36:32', '2025-07-25 10:19:49');

-- --------------------------------------------------------

--
-- Stand-in structure for view `user_statistics`
-- (See below for the actual view)
--
CREATE TABLE `user_statistics` (
`total_users` bigint(21)
,`admin_users` decimal(22,0)
,`regular_users` decimal(22,0)
,`active_users` decimal(22,0)
,`inactive_users` decimal(22,0)
,`newsletter_subscribers` decimal(22,0)
,`verified_emails` decimal(22,0)
,`users_who_logged_in` decimal(22,0)
,`new_users_last_30_days` decimal(22,0)
,`active_users_last_30_days` decimal(22,0)
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

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `inventory_unique` (`product_id`,`size`,`color`),
  ADD KEY `inventory_product_id_foreign` (`product_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `orders_user_id_foreign` (`user_id`),
  ADD KEY `orders_status_index` (`status`),
  ADD KEY `orders_payment_status_index` (`payment_status`),
  ADD KEY `orders_order_number_index` (`order_number`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_items_order_id_foreign` (`order_id`),
  ADD KEY `order_items_product_id_foreign` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `products_category_id_foreign` (`category_id`),
  ADD KEY `products_is_active_index` (`is_active`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_images_product_id_foreign` (`product_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reviews_user_id_product_id_unique` (`user_id`,`product_id`),
  ADD KEY `reviews_product_id_foreign` (`product_id`),
  ADD KEY `reviews_order_item_id_foreign` (`order_item_id`),
  ADD KEY `reviews_is_approved_index` (`is_approved`);

--
-- Indexes for table `shopping_cart`
--
ALTER TABLE `shopping_cart`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shopping_cart_user_id_foreign` (`user_id`),
  ADD KEY `shopping_cart_product_id_foreign` (`product_id`),
  ADD KEY `shopping_cart_session_id_index` (`session_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_role_index` (`role`),
  ADD KEY `users_is_active_index` (`is_active`),
  ADD KEY `users_created_at_index` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shopping_cart`
--
ALTER TABLE `shopping_cart`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `inventory_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `product_images_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_order_item_id_foreign` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `reviews_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shopping_cart`
--
ALTER TABLE `shopping_cart`
  ADD CONSTRAINT `shopping_cart_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `shopping_cart_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
