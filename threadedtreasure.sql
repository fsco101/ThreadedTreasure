-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 30, 2025 at 05:14 AM
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
(5, 'Footwear', 'Comfortable and stylish shoes for all occasions', 'categories/footwear.jpg', '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(6, 'sadsadasa', 'sadsadasdsad', NULL, '2025-07-25 14:31:02', '2025-07-26 14:32:33'),
(7, 'aaaaaaaa', 'aaaaaaaa', NULL, '2025-07-27 04:34:10', '2025-07-27 04:34:10');

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
(8, 8, 'One Size', 'Default', 100, '2025-07-25 14:31:39', '2025-07-26 11:59:46'),
(11, 11, 'One Size', 'Default', 223, '2025-07-27 04:35:01', '2025-07-27 06:28:57'),
(12, 12, 'One Size', 'Default', 22222, '2025-07-27 06:29:15', '2025-07-27 15:02:02'),
(13, 13, 'One Size', 'Default', 1, '2025-07-28 06:19:40', '2025-07-28 06:23:20');

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

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `order_number`, `status`, `payment_status`, `payment_method`, `subtotal`, `total_amount`, `created_at`, `updated_at`) VALUES
(6, 8, 'TT250447N5AEW8', 'cancelled', 'failed', 'cod', 11110.00, 11998.80, '2025-07-25 12:07:30', '2025-07-25 13:10:41'),
(7, 8, 'TT6756546VG18Y', 'cancelled', 'failed', 'cod', 13332.00, 14398.56, '2025-07-25 12:14:35', '2025-07-25 13:48:36'),
(8, 8, 'TT1240757ECAYK', 'cancelled', 'processing', 'gcash', 13361.99, 14430.95, '2025-07-25 12:22:04', '2025-07-25 13:49:42'),
(12, 9, 'TT089928VXNGDT', 'delivered', 'completed', 'bank-transfer', 2323.00, 2508.84, '2025-07-25 14:18:09', '2025-07-25 14:22:40'),
(13, 9, 'TT0315194C0U7S', 'delivered', 'completed', 'bank-transfer', 4.00, 14.31, '2025-07-25 14:33:51', '2025-07-25 14:40:45'),
(14, 9, 'TT484038NJ8D7Q', 'delivered', 'completed', 'cod', 20.00, 31.59, '2025-07-25 14:41:24', '2025-07-25 14:53:05'),
(15, 9, 'TT222872RSDEMF', 'delivered', 'completed', 'bank-transfer', 4.00, 14.31, '2025-07-25 14:53:42', '2025-07-25 14:54:04'),
(17, 9, 'TT105705X2DR68', 'delivered', 'completed', 'cod', 4949.45, 5345.41, '2025-07-25 16:15:05', '2025-07-25 16:15:44'),
(18, 9, 'TT606879G1FWYO', 'delivered', 'completed', 'cod', 89.99, 107.18, '2025-07-26 06:00:06', '2025-07-26 08:19:52'),
(19, 8, 'TT79439250NN94', 'pending', 'pending', 'cod', 20907.00, 22579.56, '2025-07-26 07:26:34', '2025-07-26 07:26:34'),
(20, 8, 'TT865966FCQMKP', 'pending', 'pending', 'gcash', 2323.00, 2508.84, '2025-07-26 07:27:45', '2025-07-26 07:27:45'),
(23, 8, 'TT442346KC7C25', 'cancelled', 'pending', 'gcash', 2222.00, 2399.76, '2025-07-26 12:54:02', '2025-07-26 12:54:02'),
(24, 8, 'TT073199GGRF43', 'delivered', 'completed', 'gcash', 86.00, 102.87, '2025-07-26 13:37:53', '2025-07-26 13:38:22'),
(25, 8, 'TT1297643FATKB', 'cancelled', 'pending', 'bank-transfer', 86.00, 102.87, '2025-07-26 13:38:49', '2025-07-26 13:38:49'),
(26, 8, 'TT323500GPKFK8', 'cancelled', 'failed', 'bank-transfer', 43.00, 56.43, '2025-07-26 13:42:03', '2025-07-26 16:42:43'),
(31, 8, 'TT7249598MP2QY', 'delivered', 'completed', 'gcash', 43.00, 56.43, '2025-07-27 04:15:24', '2025-07-27 04:15:45'),
(32, 8, 'TT181011P8VAN4', 'delivered', 'completed', 'gcash', 43.00, 56.43, '2025-07-27 04:23:01', '2025-07-27 04:23:22'),
(33, 8, 'TT774298KETVS1', 'delivered', 'completed', 'cod', 22.00, 33.75, '2025-07-27 05:06:14', '2025-07-27 05:06:27'),
(34, 10, 'TT70536641YKEA', 'delivered', 'completed', 'gcash', 22.00, 33.75, '2025-07-27 05:38:25', '2025-07-27 09:33:43'),
(35, 8, 'TT786028FNPO3O', 'delivered', 'completed', 'cod', 22222.00, 23999.76, '2025-07-27 06:29:46', '2025-07-27 06:30:24'),
(36, 8, 'TT783063KO9MB8', 'cancelled', 'pending', 'gcash', 44444.00, 47999.52, '2025-07-27 06:46:23', '2025-07-27 06:46:23'),
(38, 8, 'TT0244197RSCJ8', 'shipped', 'completed', 'bank-transfer', 22222.00, 23999.76, '2025-07-27 06:50:24', '2025-07-27 07:06:17'),
(39, 8, 'TT854836LY6RJ1', 'pending', 'pending', 'gcash', 22.00, 33.75, '2025-07-27 10:40:54', '2025-07-27 10:40:54'),
(40, 8, 'TT676031OSJVXH', 'pending', 'pending', 'cod', 87.00, 103.95, '2025-07-27 10:54:36', '2025-07-27 10:54:36'),
(41, 8, 'TT450657AMNQ8L', 'pending', 'pending', 'gcash', 299.98, 323.98, '2025-07-27 13:54:10', '2025-07-27 13:54:10'),
(42, 8, 'TT540523CT9KHT', 'pending', 'pending', 'gcash', 22.00, 33.75, '2025-07-27 13:55:40', '2025-07-27 13:55:40'),
(43, 8, 'TT823064XFY3HH', 'pending', 'pending', 'gcash', 149.99, 161.99, '2025-07-27 14:00:23', '2025-07-27 14:00:23'),
(44, 8, 'TT911934J9HAIG', 'pending', 'pending', 'gcash', 29.99, 42.38, '2025-07-27 14:01:51', '2025-07-27 14:01:51'),
(45, 8, 'TT148419NJ52FO', 'pending', 'pending', 'gcash', 22.00, 33.75, '2025-07-27 14:05:48', '2025-07-27 14:05:48'),
(46, 8, 'TT191831J0LP80', 'pending', 'pending', 'gcash', 22.00, 33.75, '2025-07-27 14:06:31', '2025-07-27 14:06:31'),
(47, 8, 'TT243593H8IX3Z', 'pending', 'pending', 'bank-transfer', 22.00, 33.75, '2025-07-27 14:07:23', '2025-07-27 14:07:23'),
(48, 8, 'TT59246760U6OJ', 'pending', 'pending', 'bank-transfer', 44.00, 57.51, '2025-07-27 14:13:12', '2025-07-27 14:13:12'),
(49, 8, 'TT752495H12K9M', 'pending', 'pending', 'gcash', 4444.00, 4799.52, '2025-07-27 14:15:52', '2025-07-27 14:15:52'),
(50, 8, 'TT865756GHT0JF', 'pending', 'pending', 'bank-transfer', 22.00, 33.75, '2025-07-27 14:17:45', '2025-07-27 14:17:45'),
(51, 8, 'TT9220913AZ467', 'pending', 'pending', 'cod', 22222.00, 23999.76, '2025-07-27 14:18:42', '2025-07-27 14:18:42'),
(52, 8, 'TT000169VPFTCU', 'pending', 'pending', 'cod', 22.00, 33.75, '2025-07-27 14:20:00', '2025-07-27 14:20:00'),
(53, 8, 'TT041126829FTR', 'pending', 'pending', 'cod', 2222.00, 2399.76, '2025-07-27 14:20:41', '2025-07-27 14:20:41'),
(54, 8, 'TT309515TN6CKG', 'pending', 'pending', 'bank-transfer', 44.00, 57.51, '2025-07-27 14:25:09', '2025-07-27 14:25:09'),
(55, 8, 'TT388493ONH87C', 'pending', 'pending', 'cod', 22222.00, 23999.76, '2025-07-27 14:26:28', '2025-07-27 14:26:28'),
(56, 8, 'TT487170GHULDW', 'pending', 'pending', 'cod', 44444.00, 47999.52, '2025-07-27 14:28:07', '2025-07-27 14:28:07'),
(57, 8, 'TT582362O0U8KU', 'pending', 'pending', 'cod', 22222.00, 23999.76, '2025-07-27 14:29:42', '2025-07-27 14:29:42'),
(58, 8, 'TT6346302W7GCF', 'pending', 'pending', 'gcash', 2222.00, 2399.76, '2025-07-27 14:30:34', '2025-07-27 14:30:34'),
(59, 8, 'TT045963Q7CCUS', 'pending', 'pending', 'cod', 2222.00, 2399.76, '2025-07-27 14:37:25', '2025-07-27 14:37:25'),
(60, 8, 'TT112252OZUKTK', 'pending', 'pending', 'cod', 29.99, 42.38, '2025-07-27 14:38:32', '2025-07-27 14:38:32'),
(61, 8, 'TT196994TO3F18', 'pending', 'pending', 'cod', 2222.00, 2399.76, '2025-07-27 14:39:56', '2025-07-27 14:39:56'),
(62, 8, 'TT633536D3T8NC', 'pending', 'pending', 'gcash', 22.00, 33.75, '2025-07-27 14:47:13', '2025-07-27 14:47:13'),
(63, 8, 'TT709836QOAKQE', 'pending', 'pending', 'gcash', 22.00, 33.75, '2025-07-27 14:48:29', '2025-07-27 14:48:29'),
(64, 8, 'TT999427IFQPID', 'delivered', 'completed', 'gcash', 22.00, 33.75, '2025-07-27 14:53:19', '2025-07-27 15:06:51'),
(65, 8, 'TT722760YEQWLR', 'pending', 'pending', 'gcash', 22.00, 33.75, '2025-07-27 15:05:22', '2025-07-27 15:05:22'),
(66, 8, 'TT895839ZL81FV', 'pending', 'pending', 'cod', 44.00, 57.51, '2025-07-27 15:08:15', '2025-07-27 15:08:15'),
(67, 8, 'TT067641ONZOJ5', 'pending', 'pending', 'cod', 22.00, 33.75, '2025-07-27 15:11:07', '2025-07-27 15:11:07'),
(68, 8, 'TT121985T5FOU8', 'pending', 'pending', 'gcash', 2222.00, 2399.76, '2025-07-27 15:28:41', '2025-07-27 15:28:41'),
(69, 8, 'TT151718UHRDX3', 'pending', 'pending', 'bank-transfer', 44.00, 57.51, '2025-07-27 15:29:11', '2025-07-27 15:29:11'),
(70, 8, 'TT5749618E2AJ9', 'pending', 'pending', 'bank-transfer', 110.00, 118.80, '2025-07-28 01:19:34', '2025-07-28 01:19:34'),
(71, 10, 'TT715820ZASJH0', 'delivered', 'completed', 'gcash', 66666.00, 71999.28, '2025-07-28 01:21:55', '2025-07-28 01:23:37');

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

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `size`, `color`, `quantity`, `unit_price`, `total_price`, `created_at`, `updated_at`) VALUES
(13, 13, 8, 'xxxxxxxxxxx', 'M', 'Black', 2, 2.00, 4.00, '2025-07-25 14:33:51', '2025-07-25 14:33:51'),
(14, 14, 8, 'xxxxxxxxxxx', 'M', 'Default', 10, 2.00, 20.00, '2025-07-25 14:41:24', '2025-07-25 14:41:24'),
(15, 15, 8, 'xxxxxxxxxxx', 'M', 'Default', 2, 2.00, 4.00, '2025-07-25 14:53:42', '2025-07-25 14:53:42'),
(24, 23, 8, 'xxxxxxxxxxx', 'M', 'Default', 1, 2222.00, 2222.00, '2025-07-26 12:54:02', '2025-07-26 12:54:02'),
(34, 33, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 05:06:14', '2025-07-27 05:06:14'),
(35, 34, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 05:38:25', '2025-07-27 05:38:25'),
(36, 35, 12, '11112212', 'M', 'Default', 1, 22222.00, 22222.00, '2025-07-27 06:29:46', '2025-07-27 06:29:46'),
(37, 36, 12, '11112212', 'M', 'Default', 2, 22222.00, 44444.00, '2025-07-27 06:46:23', '2025-07-27 06:46:23'),
(39, 38, 12, '11112212', 'M', 'Black', 1, 22222.00, 22222.00, '2025-07-27 06:50:24', '2025-07-27 06:50:24'),
(40, 39, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 10:40:54', '2025-07-27 10:40:54'),
(41, 40, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 10:54:36', '2025-07-27 10:54:36'),
(42, 40, 11, '2easdsad', 'M', 'Black', 1, 22.00, 22.00, '2025-07-27 10:54:36', '2025-07-27 10:54:36'),
(44, 41, 4, 'Leather Crossbody Bag', 'M', 'Black', 2, 149.99, 299.98, '2025-07-27 13:54:10', '2025-07-27 13:54:10'),
(45, 42, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 13:55:40', '2025-07-27 13:55:40'),
(46, 43, 4, 'Leather Crossbody Bag', 'M', 'Default', 1, 149.99, 149.99, '2025-07-27 14:00:23', '2025-07-27 14:00:23'),
(48, 45, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:05:48', '2025-07-27 14:05:48'),
(49, 46, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:06:31', '2025-07-27 14:06:31'),
(50, 47, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:07:23', '2025-07-27 14:07:23'),
(51, 48, 11, '2easdsad', 'M', 'Default', 2, 22.00, 44.00, '2025-07-27 14:13:12', '2025-07-27 14:13:12'),
(52, 49, 8, 'xxxxxxxxxxx', 'M', 'Default', 2, 2222.00, 4444.00, '2025-07-27 14:15:52', '2025-07-27 14:15:52'),
(53, 50, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:17:45', '2025-07-27 14:17:45'),
(54, 51, 12, '11112212', 'M', 'Default', 1, 22222.00, 22222.00, '2025-07-27 14:18:42', '2025-07-27 14:18:42'),
(55, 52, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:20:00', '2025-07-27 14:20:00'),
(56, 53, 8, 'xxxxxxxxxxx', 'M', 'Default', 1, 2222.00, 2222.00, '2025-07-27 14:20:41', '2025-07-27 14:20:41'),
(57, 54, 11, '2easdsad', 'M', 'Default', 2, 22.00, 44.00, '2025-07-27 14:25:09', '2025-07-27 14:25:09'),
(58, 55, 12, '11112212', 'M', 'Default', 1, 22222.00, 22222.00, '2025-07-27 14:26:28', '2025-07-27 14:26:28'),
(59, 56, 12, '11112212', 'M', 'Default', 2, 22222.00, 44444.00, '2025-07-27 14:28:07', '2025-07-27 14:28:07'),
(60, 57, 12, '11112212', 'M', 'Default', 1, 22222.00, 22222.00, '2025-07-27 14:29:42', '2025-07-27 14:29:42'),
(61, 58, 8, 'xxxxxxxxxxx', 'M', 'Default', 1, 2222.00, 2222.00, '2025-07-27 14:30:34', '2025-07-27 14:30:34'),
(62, 59, 8, 'xxxxxxxxxxx', 'M', 'Default', 1, 2222.00, 2222.00, '2025-07-27 14:37:25', '2025-07-27 14:37:25'),
(64, 61, 8, 'xxxxxxxxxxx', 'M', 'Default', 1, 2222.00, 2222.00, '2025-07-27 14:39:56', '2025-07-27 14:39:56'),
(65, 62, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:47:13', '2025-07-27 14:47:13'),
(66, 63, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:48:29', '2025-07-27 14:48:29'),
(67, 64, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 14:53:19', '2025-07-27 14:53:19'),
(68, 65, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 15:05:22', '2025-07-27 15:05:22'),
(69, 66, 11, '2easdsad', 'M', 'Default', 2, 22.00, 44.00, '2025-07-27 15:08:15', '2025-07-27 15:08:15'),
(70, 67, 11, '2easdsad', 'M', 'Default', 1, 22.00, 22.00, '2025-07-27 15:11:07', '2025-07-27 15:11:07'),
(71, 68, 8, 'xxxxxxxxxxx', 'M', 'Default', 1, 2222.00, 2222.00, '2025-07-27 15:28:42', '2025-07-27 15:28:42'),
(72, 69, 11, '2easdsad', 'M', 'Default', 2, 22.00, 44.00, '2025-07-27 15:29:11', '2025-07-27 15:29:11'),
(73, 70, 11, '2easdsad', 'M', 'Black', 5, 22.00, 110.00, '2025-07-28 01:19:34', '2025-07-28 01:19:34'),
(74, 71, 12, 'a', 'M', 'Default', 3, 22222.00, 66666.00, '2025-07-28 01:21:55', '2025-07-28 01:21:55');

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
(4, 'Leather Crossbody Bag', 'Stylish and functional crossbody bag made from genuine leather. Perfect for daily use.', 149.99, 119.99, 4, 'ThreadedTreasure', 'products/leather-crossbody-bag.jpg', '[\"One Size\"]', '[\"Black\", \"Brown\", \"Tan\"]', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(5, 'Canvas Sneakers', 'Comfortable canvas sneakers perfect for casual wear. Features cushioned insole and durable construction.', 59.99, NULL, 5, 'ThreadedTreasure', 'products/canvas-sneakers.jpg', '[\"6\", \"7\", \"8\", \"9\", \"10\", \"11\", \"12\"]', '[\"White\", \"Black\", \"Red\", \"Navy\"]', 1, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(8, 'xxxxxxxxxxx', 'asaadsas', 2222.00, NULL, 6, NULL, 'products/product_images-1753453899069-579943823.png', NULL, NULL, 1, '2025-07-25 14:31:39', '2025-07-26 11:59:46'),
(11, '2easdsad', 'aaaa', 22.00, NULL, 7, NULL, 'products/product_images-1753590901028-21371814.png', NULL, NULL, 1, '2025-07-27 04:35:01', '2025-07-27 06:28:57'),
(12, 'a', '22222', 22222.00, NULL, 7, NULL, 'products/product_images-1753597755636-565324041.png', NULL, NULL, 1, '2025-07-27 06:29:15', '2025-07-27 15:02:02'),
(13, '0', '1', 1.00, NULL, 7, NULL, 'products/product_images-1753683580301-337346219.png', NULL, NULL, 1, '2025-07-28 06:19:40', '2025-07-28 06:23:20');

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
(11, 8, 'products/product_images-1753453899069-579943823.png', 'xxxxxxxxxxx - Image 1', 1, '2025-07-25 14:31:39', '2025-07-25 14:31:39'),
(12, 8, 'products/product_images-1753453899089-432625553.png', 'xxxxxxxxxxx - Image 2', 2, '2025-07-25 14:31:39', '2025-07-25 14:31:39'),
(13, 8, 'products/product_images-1753453899107-700448071.png', 'xxxxxxxxxxx - Image 3', 3, '2025-07-25 14:31:39', '2025-07-25 14:31:39'),
(15, 11, 'products/product_images-1753590901028-21371814.png', '2easdsad - Image 1', 1, '2025-07-27 04:35:01', '2025-07-27 04:35:01'),
(16, 11, 'products/product_images-1753590901039-13623561.png', '2easdsad - Image 2', 2, '2025-07-27 04:35:01', '2025-07-27 04:35:01'),
(17, 11, 'products/product_images-1753590901043-584868023.png', '2easdsad - Image 3', 3, '2025-07-27 04:35:01', '2025-07-27 04:35:01'),
(18, 11, 'products/product_images-1753590901047-770937243.png', '2easdsad - Image 4', 4, '2025-07-27 04:35:01', '2025-07-27 04:35:01'),
(19, 11, 'products/product_images-1753590901051-197401212.png', '2easdsad - Image 5', 5, '2025-07-27 04:35:01', '2025-07-27 04:35:01'),
(20, 12, 'products/product_images-1753597755636-565324041.png', '11112212 - Image 1', 1, '2025-07-27 06:29:15', '2025-07-27 06:29:15'),
(21, 12, 'products/product_images-1753597755645-163142543.png', '11112212 - Image 2', 2, '2025-07-27 06:29:15', '2025-07-27 06:29:15'),
(22, 12, 'products/product_images-1753597755654-878743929.png', '11112212 - Image 3', 3, '2025-07-27 06:29:15', '2025-07-27 06:29:15'),
(23, 12, 'products/product_images-1753597755656-27676798.png', '11112212 - Image 4', 4, '2025-07-27 06:29:15', '2025-07-27 06:29:15'),
(24, 13, 'products/product_images-1753683580301-337346219.png', '1 - Image 1', 1, '2025-07-28 06:19:40', '2025-07-28 06:19:40'),
(25, 13, 'products/product_images-1753683580312-725579261.png', '1 - Image 2', 2, '2025-07-28 06:19:40', '2025-07-28 06:19:40'),
(26, 13, 'products/product_images-1753683580318-548709201.png', '1 - Image 3', 3, '2025-07-28 06:19:40', '2025-07-28 06:19:40');

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
  `role` enum('admin','customer','user') NOT NULL DEFAULT 'user',
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
(2, 'John Doe', 'john@example.com', NULL, '$2b$10$example.hash.here', '+1234567890', NULL, NULL, NULL, '123 Main St, City, State 12345', 'user', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-26 09:46:46'),
(4, 'Bob Johnson', 'bob@example.com', NULL, '$2b$10$example.hash.here', '+1234567892', NULL, NULL, NULL, '789 Pine Rd, City, State 12345', 'user', 0, 1, 0, NULL, NULL, NULL, NULL, NULL, '2025-07-12 08:00:00', '2025-07-12 08:00:00'),
(7, 'admin', 'admin@gmail.com', NULL, '$2b$12$kW8qnnBgvtPokHv1Nmrb/OHwWgadbz/4ZsM.8S/5GK3B7GhBqzUjW', '12345678900', NULL, NULL, NULL, 'tyj', 'user', 1, 0, 0, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInR5cGUiOiJlbWFpbF92ZXJpZmljYXRpb24iLCJpYXQiOjE3NTM0MTM4NTcsImV4cCI6MTc1MzUwMDI1N30.6MrJCAre0WxhIDibzR5mucpF9O_b_JNLwdNAclcrmKY', NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiZW1haWwiOiJhZG1pbkBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4', '2025-07-25 03:24:17', '2025-07-27 09:41:20'),
(8, 'adminnew12', 'adminnew@gmail.com', NULL, '$2b$12$6v65d5/gLLniuO5t.xZVWO1QS7Dn7RWsH.K0DD.mXxWqg6xMcfVNm', '13123131231', NULL, NULL, 'avatar-1753522040070-622173245.png', 'sa bahay naminaaah', 'admin', 1, 0, 0, NULL, NULL, NULL, '2025-07-28 09:23:13', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwiZW1haWwiOiJhZG1pbm5ld0BnbWFpbC5jb20iLCJyb2xlIjoiYWR', '2025-07-25 03:36:32', '2025-07-28 05:56:36'),
(9, '', '', NULL, '$2b$12$V4bQn/EI/3YtEBu1VZESJuQZekiFvAaXLQXxFD6qPqadG2LiHP7ZG', NULL, NULL, NULL, 'avatar-1753519764352-569617172.png', NULL, 'user', 0, 0, 0, NULL, NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwiZW1haWwiOiJyYW1vbmZyYW5jaXNjbzA5NjY0NEBnbWFpbC5jb20', '2025-07-25 14:17:49', '2025-07-26 09:00:29'),
(10, 'user123', 'ramonfrancisco1368@gmail.com', NULL, '$2b$12$bY.EUwC5604meLWnfgN6Ae46NX5z8dFHR8NzUVr0At7S9bMyO5er2', '24324323242432432', NULL, NULL, 'avatar-1753604545338-263868279.png', '4324324324324', 'user', 1, 0, 0, NULL, NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsImVtYWlsIjoicmFtb25mcmFuY2lzY28xMzY4QGdtYWlsLmNvbSI', '2025-07-26 09:41:52', '2025-07-27 08:22:25'),
(11, 'users', 'user1234@gmail.com', NULL, '$2b$12$PIAxx56yPI1ZYLgo9LMmDeQv9IujO6Saz7T5ffynaAjuaaNPP6gxe', '3433242324243243', NULL, NULL, NULL, 'cewrtewtc', 'customer', 1, 0, 0, NULL, NULL, NULL, '2025-07-26 17:48:24', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTEsImVtYWlsIjoidXNlcjEyMzRAZ21haWwuY29tIiwicm9sZSI6ImN', '2025-07-26 09:48:24', '2025-07-26 09:48:24'),
(12, 'usersss', 'user12345@gmail.com', NULL, '$2b$12$p//MwH8S073dEW4JI/mt/.rUzCiOYhmReYqfOos2Y.mfBagJ3dTWO', '2473828743283832', NULL, NULL, NULL, '34345435354', 'user', 1, 0, 0, NULL, NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsImVtYWlsIjoidXNlcjEyMzQ1QGdtYWlsLmNvbSIsInJvbGUiOiJ', '2025-07-26 09:57:03', '2025-07-27 05:07:33'),
(14, 'usernanaman', 'usernanaman@gmail.com', NULL, '$2b$12$ZaJtcT4wYLkOLAq/WCUfw.V.8LVI3HzNZS7qV871fv5lSIdup0msW', '939437594584', NULL, NULL, NULL, '67486748354378ufhdsfjsdh', 'user', 1, 0, 0, NULL, NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTQsImVtYWlsIjoidXNlcm5hbmFtYW5AZ21haWwuY29tIiwicm9sZSI', '2025-07-26 10:13:04', '2025-07-26 10:13:14'),
(15, 'pogiako', 'pogiako@gmail.com', NULL, '$2b$12$e86cKazkcp857vsVuP//JukiCIQj1d.SZv3oj10GCXUCN.xCbhT5G', '4786328746324862', NULL, NULL, NULL, 'sadadsadassdd', 'user', 1, 0, 0, NULL, NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsImVtYWlsIjoicG9naWFrb0BnbWFpbC5jb20iLCJyb2xlIjoiY3V', '2025-07-26 10:35:31', '2025-07-26 14:33:25'),
(16, 'poginanaman12', 'poginanaman@gmail.com', NULL, '$2b$12$HwpyhDzdJx9aakCE0bz3w.55YZphltMPEmAc2sMekl7pY12djkN0m', '32432432324324', NULL, NULL, NULL, '432432432432', 'admin', 1, 0, 0, NULL, NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTYsImVtYWlsIjoicG9naW5hbmFtYW5AZ21haWwuY29tIiwicm9sZSI', '2025-07-26 10:37:23', '2025-07-27 09:09:53');

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

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
  ADD CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

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
