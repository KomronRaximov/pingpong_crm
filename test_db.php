<?php
try {
    $db = new PDO('sqlite:backend/backend_new/database/database.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $result = $db->query("SELECT name FROM sqlite_master WHERE type='table'");
    echo "Tables:\n";
    foreach ($result as $row) {
        echo "- " . $row['name'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
