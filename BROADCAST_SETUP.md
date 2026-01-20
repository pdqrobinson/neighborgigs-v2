# Broadcast Migration Instructions

The broadcast functionality requires adding columns to the database. Follow these steps:

## Option 1: Run via Supabase SQL Editor (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project (kxpglaetbawiugqmihfj)
3. Navigate to **SQL Editor** in the left sidebar
4. Copy and paste the SQL from `BROADCAST_MIGRATION.sql`
5. Click **Run** to execute
6. Verify it worked by checking the results table at the bottom

## Option 2: Run via CLI (Requires Database Credentials)

If you have direct database access:

```bash
# Set your database password
export DB_PASSWORD="your-database-password"

# Run the migration
PGPASSWORD=$DB_PASSWORD psql -h kxpglaetbawiugqmihfj.supabase.co \
  -U postgres -d postgres -f BROADCAST_MIGRATION.sql
```

## What the Migration Does

1. Adds `is_broadcast` column to task_requests (boolean, default false)
2. Adds `broadcast_type` column to task_requests (text: 'need_help' or 'offer_help')
3. Creates index for broadcast queries
4. Inserts 5 demo broadcasts for testing

## Test the Functionality

After running the migration, test these features:

### View Broadcasts
- Navigate to Home page
- Click "Broadcasts" tab
- You should see 5 demo broadcasts

### Create Broadcast
- Click "Start a Broadcast" button
- Select "Need Help" or "Offering Help"
- Write a message
- Choose duration (15, 30, 60, or 120 minutes)
- Click "Broadcast"
- Broadcast should appear in list

### Respond to Broadcast
- Click on any broadcast
- Response UI should appear (currently shows alert, will be completed)
- Request is sent to broadcaster

## Troubleshooting

If broadcasts don't appear:
1. Check browser console for errors (F12)
2. Check server logs: `tail /dev/shm/zosite-50430.log`
3. Verify columns exist in Supabase dashboard → Table Editor → task_requests

## Next Steps

Once migration is applied and working:
- Create response UI component (currently placeholder alert)
- Add broadcast delete functionality
- Test full end-to-end flow
