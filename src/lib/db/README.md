# Database Module

This module contains the database schema, client, and initialization logic for the Font Management System.

## Structure

- `schema.ts` - Drizzle ORM schema definitions for brands, categories, and fonts tables
- `client.ts` - Database client initialization using @libsql/client
- `init.ts` - Database initialization and utility functions
- `index.ts` - Module exports

## Environment Configuration

The database path is configured via the `DATABASE_URL` environment variable:

- **Development**: `file:./data/dev.db` (default)
- **Production**: `file:./data/prod.db`

Set in `.env.development` or `.env.production`:

```env
DATABASE_URL=file:./data/dev.db
```

## Database Schema

### Tables

#### brands

- Stores font brand/vendor information
- Fields: id, name, slug, logoUrl, bannerUrl, description, website, socialLinks, status, timestamps

#### categories

- Stores font categories (无衬线字体, 手写体, etc.)
- Fields: id, name, slug, description, order, timestamps

#### fonts

- Stores font metadata and information
- Fields: id, normalizedName, name, englishName, chineseName, fontFamily, weights (JSON), version, copyright, description, designer, foundry, releaseYear, category, fontCategory, style, categoryId (FK), brandId (FK), tags (JSON), fontTags (JSON), languages (JSON), useCases (JSON), license, licenseType, price, purchaseUrl, licenseDescription, ossPath, viewCount, downloadCount, apiCallCount, timestamps

### Indexes

- `fonts_name_idx` - Index on font name for faster searches
- `fonts_family_idx` - Index on font family
- `fonts_category_idx` - Index on category foreign key
- `fonts_brand_idx` - Index on brand foreign key

## Usage

### Import the database client

```typescript
import { db } from '@/lib/db';
```

### Initialize tables (if needed)

```typescript
import { initializeTables } from '@/lib/db';

await initializeTables();
```

### Query examples

```typescript
import { db, fonts, brands, categories } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Get all fonts
const allFonts = await db.select().from(fonts);

// Get font by ID
const font = await db.select().from(fonts).where(eq(fonts.id, 'font-id'));

// Insert a new font
await db.insert(fonts).values({
  normalizedName: 'test-font',
  name: '测试字体',
  fontFamily: 'TestFont',
  weights: {},
  version: '1.0.0',
  ossPath: '/fonts/test-font',
});
```

## Drizzle Kit Commands

```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Testing

Run the connection test:

```bash
npx tsx src/lib/db/test-connection.ts
```

## Notes

- The database uses SQLite with @libsql/client for compatibility
- Foreign keys are enabled and enforced
- JSON fields are used for complex data structures (weights, tags, etc.)
- Timestamps are stored as Unix timestamps (integer)
- The database file is automatically created if it doesn't exist
