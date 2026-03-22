const fs = require('fs');
const b64s = JSON.parse(fs.readFileSync('f:/Programador GS/voraz-project/voraz-platform/backend/temp_b64.json', 'utf8'));
const content = `import { query } from "../config/db.js";
import { v2 as cloudinary } from "cloudinary";

const IMAGES_BASE64 = ${JSON.stringify(b64s, null, 2)};

export async function runImageFix() {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    console.log("[Fix] Iniciando subida de imágenes premium...");

    const mapping = [
        { key: "burger", name: "Hamburguesa", category: "Hamburguesas" },
        { key: "pizza", name: "Pizza", category: "Pizzas" },
        { key: "fries", name: "Papas", category: "Papas" },
        { key: "drinks", name: "Bebida", category: "Bebidas" },
        { key: "dessert", name: "Postre", category: "Postres" }
    ];

    const results = [];

    for (const item of mapping) {
        try {
            const b64 = IMAGES_BASE64[item.key];
            if (!b64 || b64.length < 100) continue;

            const upload = await cloudinary.uploader.upload(b64, {
                folder: "gastrored_defaults",
                public_id: \`default_\${item.key}\`
            });

            const url = upload.secure_url;
            results.push({ item: item.key, url });

            await query(
                "UPDATE products SET image_url = $1 WHERE store_id = 1 AND (name ILIKE $2 OR name ILIKE $3)",
                [url, \`%\${item.name}%\`, \`%\${item.category.slice(0, -2)}%\`]
            );

            await query(
                "UPDATE categories SET image_url = $1 WHERE store_id = 1 AND name ILIKE $2",
                [url, \`%\${item.category}%\`]
            );

        } catch (e) {
            console.error(\`[Fix] Error en \${item.key}:\`, e.message);
        }
    }

    return results;
}`;
fs.writeFileSync('f:/Programador GS/voraz-project/voraz-platform/backend/src/utils/fixImages.js', content);
