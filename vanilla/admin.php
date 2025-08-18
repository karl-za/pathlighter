<?php
$configFile = 'config.json';
$config = [
    'title' => 'My Pathlighter',
    'description' => 'Help us reach our goal!',
    'goal' => 5000,
    'current' => 0,
];

if (file_exists($configFile)) {
    $json = file_get_contents($configFile);
    $config = json_decode($json, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $config['title'] = htmlspecialchars($_POST['title']);
    $config['description'] = htmlspecialchars($_POST['description']);
    $config['postamble'] = htmlspecialchars($_POST['postamble']);
    $config['goal'] = (float) $_POST['goal'];
    $config['current'] = (float) $_POST['current'];

    $json = json_encode($config, JSON_PRETTY_PRINT);

    file_put_contents($configFile, $json);

    $message = "Settings saved successfully!";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pathlighter Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto max-w-lg p-6 my-12 bg-white rounded-lg shadow-md">
        <h1 class="text-3xl font-bold text-gray-800 mb-4">Pathlighter Admin Panel</h1>
        <p class="text-gray-600 mb-6">Use this form to update the details for your public pathlighter page.</p>

        <?php if (isset($message)): ?>
            <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span class="block sm:inline"><?php echo $message; ?></span>
            </div>
        <?php endif; ?>

        <form action="admin.php" method="POST">
            <div class="mb-4">
                <label for="title" class="block text-gray-700 text-sm font-bold mb-2">Title</label>
                <input type="text" id="title" name="title" value="<?php echo $config['title']; ?>" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
            </div>
            <div class="mb-4">
                <label for="description" class="block text-gray-700 text-sm font-bold mb-2">Description</label>
                <textarea id="description" name="description" rows="3" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required><?php echo $config['description']; ?></textarea>
            </div>
            <div class="mb-4">
                <label for="postamble" class="block text-gray-700 text-sm font-bold mb-2">Postamble</label>
                <textarea id="postamble" name="postamble" rows="3" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required><?php echo $config['postamble']; ?></textarea>
            </div>
            <div class="mb-4">
                <label for="goal" class="block text-gray-700 text-sm font-bold mb-2">Goal Amount ($)</label>
                <input type="number" step="0.01" id="goal" name="goal" value="<?php echo $config['goal']; ?>" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
            </div>
            <div class="mb-6">
                <label for="current" class="block text-gray-700 text-sm font-bold mb-2">Current Amount Raised ($)</label>
                <input type="number" step="0.01" id="current" name="current" value="<?php echo $config['current']; ?>" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
            </div>
            <div class="flex items-center justify-between">
                <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    Save Settings
                </button>
            </div>
            <div>
                <a href="./" target="_blank" class="align-baseline font-bold text-sm text-blue-500 hover:text-blue-800 text-justify">
                    Public Page
                </a>
                <a href="./?admin=1" target="_blank" class="align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Public Page + Admin Controls
                </a>
            <div>                
        </form>
    </div>
</body>
</html>
