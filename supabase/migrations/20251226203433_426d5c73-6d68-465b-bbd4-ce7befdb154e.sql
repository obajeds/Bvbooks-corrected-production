-- Insert comprehensive help articles for BVBooks Help Center

-- Getting Started Articles
INSERT INTO help_articles (title, slug, category_id, content, excerpt, is_published, is_featured, tags, related_screens) VALUES
('Welcome to BVBooks - Your Complete Business Management Solution', 'welcome-to-bvbooks', '5ead1796-fc6f-45c8-ac66-4f293770a86b', 
'# Welcome to BVBooks

BVBooks is a complete business management solution designed specifically for Nigerian business owners. Whether you run a retail shop, supermarket, pharmacy, or any other business, BVBooks helps you manage everything in one place.

## What You Can Do With BVBooks

**Point of Sale (POS)**
Process sales quickly with our easy-to-use POS system. Scan barcodes, apply discounts, handle multiple payment methods, and print receipts.

**Inventory Management**
Track your stock levels, set reorder alerts, manage suppliers, and never run out of your best-selling products again.

**Staff Management**
Add team members, assign roles and permissions, track attendance, and manage payroll all from one dashboard.

**Customer Management**
Build customer relationships with our CRM features. Track purchases, offer credit sales, and reward loyal customers.

**Reports & Analytics**
Make informed decisions with detailed reports on sales, inventory, expenses, and staff performance.

## Getting Started Checklist

1. Complete your business profile setup
2. Add your products and set prices
3. Invite your staff members
4. Configure your branches (if you have multiple locations)
5. Start making sales!

## Need Help?

Our support team is available to help you get started. Use the chat widget in the bottom right corner to reach us anytime.', 
'Get started with BVBooks - your complete business management solution for Nigerian businesses.', 
true, true, ARRAY['getting started', 'welcome', 'overview'], ARRAY['dashboard', 'home']),

('Setting Up Your Business Profile', 'setting-up-business-profile', '5ead1796-fc6f-45c8-ac66-4f293770a86b',
'# Setting Up Your Business Profile

Your business profile is the foundation of your BVBooks account. Complete setup ensures accurate receipts, reports, and compliance.

## Required Information

**Business Name**
Enter both your legal business name (for official documents) and trading name (what customers see).

**Contact Details**
- Business phone number
- Business email address
- Physical address

**Business Category**
Select the category that best describes your business (Retail, Pharmacy, Restaurant, etc.)

## Uploading Your Business Logo

Your logo appears on:
- Printed receipts
- Customer invoices
- Email notifications

**Logo Requirements:**
- Recommended size: 200x200 pixels
- Supported formats: PNG, JPG
- Maximum file size: 2MB

## Setting Business Hours

Configure your operating hours for each day of the week. This helps with:
- After-hours activity monitoring
- Staff scheduling
- Customer expectations

## Steps to Complete Setup

1. Go to **Settings** from the sidebar
2. Click on **Business Profile**
3. Fill in all required fields
4. Upload your business logo
5. Set your business hours
6. Click **Save Changes**

Your business profile can be updated anytime from the Settings page.',
'Learn how to configure your business name, logo, contact details, and operating hours in BVBooks.',
true, false, ARRAY['setup', 'profile', 'business', 'logo'], ARRAY['settings', 'business-setup']),

('Adding Your First Products', 'adding-first-products', '5ead1796-fc6f-45c8-ac66-4f293770a86b',
'# Adding Your First Products

Products are the heart of your business. Here is how to add them to BVBooks.

## Quick Add vs Detailed Add

**Quick Add** - For simple products
- Product name
- Selling price
- Initial stock quantity

**Detailed Add** - For complete product setup
- Product name and description
- SKU (Stock Keeping Unit)
- Category assignment
- Cost price and selling price
- Stock quantity and reorder level
- Barcode assignment
- Product images

## Step-by-Step Guide

1. Go to **Inventory** → **Items** from the sidebar
2. Click the **Add Product** button
3. Enter the product name
4. Set the cost price (what you pay) and selling price (what customers pay)
5. Enter initial stock quantity
6. Select or create a category
7. Click **Save**

## Setting Up Categories First

Before adding many products, create categories to organize them:
- Food & Beverages
- Electronics
- Clothing
- Health & Beauty
- Household Items

Go to **Inventory** → **Categories** to set these up.

## Tips for Product Setup

- Use clear, descriptive names
- Include brand names for easy searching
- Set accurate cost prices for profit tracking
- Configure reorder levels to avoid stockouts
- Add barcodes for faster checkout

## Bulk Import

Have many products? Contact support to help you bulk import from Excel.',
'Learn how to add products to your BVBooks inventory with prices, stock levels, and categories.',
true, true, ARRAY['products', 'inventory', 'setup', 'add products'], ARRAY['inventory', 'items']),

('Inviting Staff Members', 'inviting-staff-members', '5ead1796-fc6f-45c8-ac66-4f293770a86b',
'# Inviting Staff Members

Add your team to BVBooks so they can help run your business. Each staff member gets their own login and permissions.

## Staff Roles

**Owner** - Full access to everything
**Manager** - Can manage daily operations, view reports, manage staff
**Cashier** - Can process sales and view basic inventory
**Stock Keeper** - Can manage inventory and stock movements

You can also create custom roles with specific permissions.

## How to Invite Staff

1. Go to **Staff** from the sidebar
2. Click **Invite Staff Member**
3. Enter the staff member email address
4. Select their role
5. Choose which branches they can access
6. Click **Send Invitation**

## What Happens Next

1. The staff member receives an email invitation
2. They click the link to create their password
3. They can now log in and start working
4. You will see them in your staff list as "Active"

## Managing Staff Access

- **Deactivate** staff who leave your business
- **Change roles** as responsibilities change
- **Limit branch access** for multi-location businesses
- **Reset passwords** if staff forget theirs

## Permissions Explained

Control exactly what each role can do:
- **View Sales** - See sales reports
- **Process Refunds** - Handle customer returns
- **Adjust Stock** - Modify inventory levels
- **View Reports** - Access business analytics
- **Manage Staff** - Add or edit team members

Go to **Settings** → **Role Permissions** to customize.',
'Add team members to your BVBooks account with the right roles and permissions.',
true, false, ARRAY['staff', 'invite', 'team', 'permissions'], ARRAY['staff', 'settings']),

-- Inventory Management Articles
('Managing Your Product Inventory', 'managing-product-inventory', '9f02382e-1d06-492f-879b-b06e91f1ac71',
'# Managing Your Product Inventory

Keep track of what you have, what is selling, and what needs restocking.

## Viewing Your Inventory

Go to **Inventory** → **Items** to see all your products with:
- Current stock levels
- Selling prices
- Product categories
- Low stock warnings

## Understanding Stock Status

- **In Stock** - Product available for sale
- **Low Stock** - Below your reorder level (yellow warning)
- **Out of Stock** - Zero quantity remaining (red warning)

## Editing Products

Click on any product to:
- Update prices
- Change stock quantities
- Edit product details
- View sales history
- Manage barcodes

## Searching and Filtering

Find products quickly by:
- Product name or SKU
- Category
- Stock status
- Price range

## Stock Alerts

BVBooks automatically alerts you when:
- Stock falls below reorder level
- Products are out of stock
- High-value items need attention

Configure alerts in **Settings** → **Notifications**.',
'Learn how to view, edit, and manage your product inventory in BVBooks.',
true, false, ARRAY['inventory', 'products', 'stock', 'management'], ARRAY['inventory', 'items']),

('Stock Adjustments and Corrections', 'stock-adjustments', '9f02382e-1d06-492f-879b-b06e91f1ac71',
'# Stock Adjustments and Corrections

Sometimes stock levels need manual adjustment. BVBooks tracks all changes for accountability.

## When to Adjust Stock

- **Physical count** reveals different quantity than system
- **Damaged goods** need to be removed
- **Expired products** must be written off
- **Found items** during stocktaking
- **Theft or loss** discovery

## How to Adjust Stock

1. Go to **Inventory** → **Stock Adjustments**
2. Click **New Adjustment**
3. Select the product
4. Choose adjustment type (Add or Remove)
5. Enter quantity and reason
6. Submit for approval (if required)

## Adjustment Types

**Positive Adjustments**
- Stock found during count
- Returned goods
- Correction of previous error

**Negative Adjustments**
- Damaged/expired goods
- Theft or loss
- Count discrepancy

## Approval Workflow

Depending on your settings, adjustments may need manager approval:
- Small adjustments: Auto-approved
- Large value adjustments: Require manager approval
- All adjustments are logged for audit

## Viewing Adjustment History

Go to **Inventory** → **Stock Adjustments** to see:
- All past adjustments
- Who made each adjustment
- Approval status
- Date and reason

This creates accountability and helps identify patterns.',
'Learn how to make stock adjustments, corrections, and write-offs in BVBooks.',
true, false, ARRAY['stock', 'adjustments', 'inventory', 'corrections'], ARRAY['inventory', 'stock-adjustments']),

('Stock Transfers Between Branches', 'stock-transfers', '9f02382e-1d06-492f-879b-b06e91f1ac71',
'# Stock Transfers Between Branches

Move products between your business locations easily and keep accurate records.

## When to Transfer Stock

- Branch A has excess, Branch B is running low
- Consolidating inventory for promotions
- Balancing stock across locations
- Supplying a new branch

## Creating a Stock Transfer

1. Go to **Inventory** → **Stock**
2. Click **Transfer Stock**
3. Select source branch (where stock is coming from)
4. Select destination branch (where stock is going)
5. Add products and quantities
6. Add transfer notes if needed
7. Submit transfer

## Transfer Workflow

1. **Initiated** - Transfer request created
2. **Pending** - Awaiting approval (if required)
3. **In Transit** - Stock deducted from source
4. **Received** - Stock added to destination
5. **Completed** - Transfer finalized

## Tracking Transfers

View all transfers in **Inventory** → **Stock** with:
- Transfer date and time
- Products and quantities
- Source and destination
- Current status
- Who initiated and approved

## Best Practices

- Physically verify quantities before confirming receipt
- Use notes to track delivery details
- Complete transfers promptly to keep inventory accurate
- Review transfer history monthly for patterns',
'Move products between branches with proper tracking and approval workflow.',
true, false, ARRAY['stock', 'transfer', 'branches', 'multi-location'], ARRAY['inventory', 'stock']),

('Managing Suppliers and Purchase Orders', 'suppliers-purchase-orders', '9f02382e-1d06-492f-879b-b06e91f1ac71',
'# Managing Suppliers and Purchase Orders

Track who you buy from and manage your purchasing process.

## Adding Suppliers

1. Go to **Inventory** → **Suppliers**
2. Click **Add Supplier**
3. Enter supplier details:
   - Company name
   - Contact person
   - Phone and email
   - Address
   - Payment terms
4. Click **Save**

## Creating Purchase Orders

1. Go to **Inventory** → **Purchase Orders**
2. Click **New Purchase Order**
3. Select the supplier
4. Add products and quantities needed
5. Set expected delivery date
6. Submit or save as draft

## Purchase Order Workflow

1. **Draft** - Still editing
2. **Submitted** - Sent to supplier
3. **Partially Received** - Some items delivered
4. **Received** - All items delivered
5. **Closed** - Order complete

## Receiving Stock

When goods arrive:
1. Open the purchase order
2. Click **Receive Stock**
3. Enter quantities received
4. Note any discrepancies
5. Confirm receipt

Stock is automatically added to your inventory.

## Supplier Reports

Track supplier performance:
- Order history
- Delivery reliability
- Pricing trends
- Outstanding orders',
'Set up suppliers and create purchase orders to manage your buying process.',
true, false, ARRAY['suppliers', 'purchase orders', 'buying', 'procurement'], ARRAY['inventory', 'suppliers', 'purchase-orders']),

-- Staff Management Articles
('Setting Up Staff Roles and Permissions', 'staff-roles-permissions', 'ef63974a-18fd-47b0-b861-02bbad510c7f',
'# Setting Up Staff Roles and Permissions

Control what each team member can see and do in BVBooks.

## Default Roles

**Owner**
- Full access to all features
- Can manage billing and subscription
- Cannot be deleted or demoted

**Manager**
- Manage daily operations
- View all reports
- Manage staff (except owners)
- Process refunds

**Cashier**
- Process sales
- View own sales
- Basic inventory viewing

**Stock Keeper**
- Manage inventory
- Create purchase orders
- Stock adjustments

## Creating Custom Roles

1. Go to **Settings** → **Role Permissions**
2. Click **Create Custom Role**
3. Name your role (e.g., "Shift Supervisor")
4. Select permissions to include
5. Save the role

## Permission Categories

**Sales**
- Process sales
- Apply discounts
- Process refunds
- View sales history

**Inventory**
- View products
- Edit products
- Adjust stock
- Transfer stock

**Reports**
- View sales reports
- View inventory reports
- View staff reports
- Export data

**Staff**
- View staff
- Manage staff
- Manage roles

**Settings**
- View settings
- Edit settings
- Manage branches

## Best Practices

- Give minimum permissions needed
- Review permissions quarterly
- Use custom roles for specific needs
- Document role responsibilities',
'Configure staff roles with the right level of access for your team.',
true, true, ARRAY['roles', 'permissions', 'access control', 'staff'], ARRAY['settings', 'staff']),

('Tracking Staff Attendance', 'staff-attendance', 'ef63974a-18fd-47b0-b861-02bbad510c7f',
'# Tracking Staff Attendance

Monitor when your team clocks in and out.

## How Attendance Works

Staff can clock in when they:
1. Log into BVBooks
2. Click the clock-in button
3. Their attendance is recorded

## Viewing Attendance Records

Go to **HRM** → **Attendance** to see:
- Daily attendance overview
- Individual staff records
- Late arrivals
- Early departures
- Total hours worked

## Attendance Status Types

- **Present** - Clocked in on time
- **Late** - Clocked in after start time
- **Absent** - No clock-in recorded
- **Half Day** - Worked partial shift
- **On Leave** - Approved time off

## Attendance Reports

Generate reports showing:
- Monthly attendance summary
- Staff punctuality trends
- Overtime hours
- Attendance patterns

## Configuring Attendance Rules

In Settings, you can set:
- Work start time
- Grace period for late arrivals
- Automatic clock-out time
- Overtime thresholds

## Using Attendance for Payroll

Attendance data integrates with payroll:
- Calculate hours worked
- Apply overtime rates
- Deduct for absences
- Track leave balances',
'Monitor staff clock-in times, attendance patterns, and work hours.',
true, false, ARRAY['attendance', 'clock-in', 'time tracking', 'HRM'], ARRAY['hrm', 'attendance']),

('Managing Leave Requests', 'leave-requests', 'ef63974a-18fd-47b0-b861-02bbad510c7f',
'# Managing Leave Requests

Handle staff time-off requests professionally.

## Leave Types

- **Annual Leave** - Regular vacation days
- **Sick Leave** - Health-related absence
- **Casual Leave** - Personal matters
- **Maternity/Paternity** - New parent leave
- **Unpaid Leave** - Time off without pay

## Staff Submitting Leave

Staff can request leave from their dashboard:
1. Click **Request Leave**
2. Select leave type
3. Choose start and end dates
4. Add reason (optional)
5. Submit request

## Approving Leave Requests

Managers see pending requests in **HRM** → **Leave**:
1. Review the request details
2. Check staff leave balance
3. Consider business needs
4. Approve or reject
5. Add notes if rejecting

## Leave Balances

Each staff member has:
- Total leave entitlement
- Used leave days
- Remaining balance
- Pending requests

## Leave Calendar

View team leave on a calendar to:
- Avoid scheduling conflicts
- Plan for busy periods
- Ensure adequate coverage

## Leave Policies

Configure in Settings:
- Leave entitlements per year
- Carry-over rules
- Approval requirements
- Blackout periods',
'Process and track staff leave requests, balances, and approvals.',
true, false, ARRAY['leave', 'time off', 'vacation', 'HRM'], ARRAY['hrm', 'leave']),

-- Reports & Analytics Articles
('Understanding Your Sales Reports', 'sales-reports', '5df9ecf5-e7f9-419e-a501-31602f7b885b',
'# Understanding Your Sales Reports

Make better business decisions with sales data insights.

## Accessing Sales Reports

Go to **Reports** from the sidebar to see:
- Daily sales summary
- Weekly and monthly trends
- Top-selling products
- Sales by payment method
- Sales by staff member

## Key Metrics Explained

**Total Revenue**
The total amount collected from sales.

**Gross Profit**
Revenue minus the cost of goods sold.

**Average Transaction Value**
Total revenue divided by number of transactions.

**Items Per Transaction**
Average number of products per sale.

## Filtering Reports

View reports by:
- Date range (today, this week, custom)
- Branch (for multi-location)
- Staff member
- Payment method
- Product category

## Sales Trends

The sales chart shows:
- Daily sales over time
- Peak selling hours
- Comparison with previous periods
- Seasonal patterns

## Exporting Reports

Download reports as:
- PDF for printing
- Excel for analysis
- CSV for accounting software

## Using Reports for Decisions

- Identify best-selling products
- Find slow-moving inventory
- Track staff performance
- Plan promotions
- Forecast demand',
'Analyze your sales data with comprehensive reports and insights.',
true, true, ARRAY['reports', 'sales', 'analytics', 'revenue'], ARRAY['reports', 'sales']),

('Inventory and Stock Reports', 'inventory-reports', '5df9ecf5-e7f9-419e-a501-31602f7b885b',
'# Inventory and Stock Reports

Keep your stock levels optimized with inventory analytics.

## Stock Level Report

Shows current inventory status:
- Products with quantities
- Stock value (cost and retail)
- Items below reorder level
- Out-of-stock items

## Stock Movement Report

Track how stock changes over time:
- Sales (stock going out)
- Purchases (stock coming in)
- Adjustments
- Transfers between branches

## Low Stock Alert Report

Critical for avoiding stockouts:
- Products below reorder level
- Days until stockout (estimated)
- Suggested reorder quantity
- Supplier information

## Dead Stock Report

Find products not selling:
- No sales in 30/60/90 days
- Stock value tied up
- Recommendations (discount, return)

## Stock Valuation Report

Understand your inventory value:
- Total cost value
- Total retail value
- Potential profit margin
- Value by category

## Best Practices

- Review low stock weekly
- Check dead stock monthly
- Reconcile with physical counts
- Track shrinkage patterns
- Plan purchases based on trends',
'Monitor stock levels, movement, and value with inventory reports.',
true, false, ARRAY['inventory', 'stock', 'reports', 'analytics'], ARRAY['reports', 'inventory']),

-- Loss Prevention Articles
('Protecting Your Business from Theft', 'loss-prevention-basics', '58c2cb39-af10-4030-8feb-0e941985433c',
'# Protecting Your Business from Theft

BVBooks helps you detect and prevent losses.

## Common Sources of Loss

**Employee Theft**
- Fake refunds
- Voided transactions
- Cash drawer discrepancies
- Stock theft

**Customer Theft**
- Shoplifting
- Price switching
- Return fraud

**Operational Loss**
- Pricing errors
- Stock damage
- Expired goods
- Administrative mistakes

## How BVBooks Helps

**Transaction Monitoring**
- All sales are logged with staff ID
- Refunds require approval
- Voids are tracked and reported
- Discounts have limits

**Stock Tracking**
- Regular stock counts
- Adjustment audit trails
- Transfer verification
- Shrinkage reports

**Access Controls**
- Role-based permissions
- Action logging
- Session timeouts
- Multi-branch restrictions

## Warning Signs to Watch

- High refund rates by specific staff
- Frequent voids during certain shifts
- Stock counts not matching
- After-hours system access
- Unusual discount patterns

## Staff Risk Scoring

BVBooks calculates risk scores based on:
- Refund frequency
- Discount usage
- Void patterns
- Cash discrepancies

Review high-risk staff in the dashboard.',
'Learn how BVBooks helps protect your business from theft and losses.',
true, true, ARRAY['security', 'theft', 'loss prevention', 'fraud'], ARRAY['dashboard', 'reports']),

('After Hours Activity Monitoring', 'after-hours-monitoring', '58c2cb39-af10-4030-8feb-0e941985433c',
'# After Hours Activity Monitoring

Detect suspicious activity outside business hours.

## What Gets Monitored

BVBooks tracks activity outside your configured business hours:
- System logins
- Sales transactions
- Stock adjustments
- Cash drawer access
- Report generation

## Setting Business Hours

1. Go to **Settings** → **Business Hours**
2. Set opening and closing times for each day
3. Mark closed days
4. Save changes

## Viewing After-Hours Alerts

Dashboard shows:
- Recent after-hours activity
- Staff member involved
- Activity type
- Time and details

## Responding to Alerts

When you see an alert:
1. Review the activity details
2. Check if it was authorized
3. Speak with the staff member
4. Mark as reviewed
5. Take action if needed

## Legitimate After-Hours Activity

Some activity may be okay:
- Manager doing end-of-day reports
- Stocktaking after close
- Emergency transactions

Configure exceptions in Settings.

## Alert Notifications

Get notified of after-hours activity via:
- Dashboard alerts
- Email notifications
- SMS (if configured)

Set preferences in **Settings** → **Notifications**.',
'Monitor and respond to business activity that occurs outside operating hours.',
true, false, ARRAY['security', 'after hours', 'monitoring', 'alerts'], ARRAY['dashboard', 'settings']),

-- Billing & Subscriptions Articles
('Understanding Your BVBooks Subscription', 'subscription-plans', '0d436812-6a40-4cde-a40c-be251fdb4759',
'# Understanding Your BVBooks Subscription

Choose the plan that fits your business needs.

## Available Plans

**Starter**
Perfect for small businesses
- 1 branch
- 2 staff members
- Basic POS and inventory
- Email support

**Professional**
For growing businesses
- Up to 3 branches
- 10 staff members
- Full reporting
- Priority support
- Staff permissions

**Enterprise**
For large operations
- Unlimited branches
- Unlimited staff
- Advanced analytics
- Dedicated support
- Custom integrations

## What is Included in All Plans

- Point of Sale system
- Basic inventory management
- Customer management
- Sales receipts
- Mobile access

## Viewing Your Current Plan

Go to **Settings** → **Subscription** to see:
- Your current plan
- Billing cycle
- Next payment date
- Usage statistics

## Feature Limits

Each plan has limits on:
- Number of branches
- Number of staff
- Products (some plans)
- Transaction history

Upgrade to increase limits.

## Trial Period

New accounts get a 14-day free trial:
- Full access to all features
- No credit card required
- Easy upgrade when ready',
'Learn about BVBooks subscription plans, features, and pricing.',
true, true, ARRAY['subscription', 'plans', 'pricing', 'billing'], ARRAY['subscription', 'settings']),

('Managing Payments and Billing', 'payments-billing', '0d436812-6a40-4cde-a40c-be251fdb4759',
'# Managing Payments and Billing

Keep your subscription active with easy payment options.

## Payment Methods

BVBooks accepts:
- Debit/Credit cards
- Bank transfer
- Paystack (for Nigerian cards)

## Setting Up Payment

1. Go to **Settings** → **Subscription**
2. Click **Update Payment Method**
3. Enter card details or choose bank transfer
4. Verify the payment
5. Payment method is saved for future billing

## Billing Cycle

Your subscription renews:
- Monthly plans: Same date each month
- Quarterly plans: Every 3 months
- Annual plans: Once per year (best value)

## Viewing Invoices

Find all your invoices in **Settings** → **Subscription**:
- Invoice date and amount
- Payment status
- Download PDF
- Transaction reference

## Failed Payments

If a payment fails:
1. You receive email notification
2. We retry after 3 days
3. Update payment method if needed
4. Account remains active for grace period

## Upgrading Your Plan

To upgrade:
1. Go to **Settings** → **Subscription**
2. Click **Upgrade Plan**
3. Choose new plan
4. Pay the difference
5. New features activate immediately

## Cancellation

Contact support to cancel:
- Access continues until period ends
- Data is retained for 30 days
- You can reactivate anytime',
'Handle subscription payments, view invoices, and manage billing.',
true, false, ARRAY['payments', 'billing', 'invoices', 'subscription'], ARRAY['subscription', 'settings']),

-- Troubleshooting Articles
('Common Issues and How to Fix Them', 'common-issues', 'a534216d-e472-4885-b7a4-f670447ad3d2',
'# Common Issues and How to Fix Them

Quick solutions to frequent problems.

## Cannot Log In

**Check your email and password**
- Make sure CAPS LOCK is off
- Use the email you registered with
- Click "Forgot Password" to reset

**Account locked?**
- Too many wrong attempts locks your account
- Wait 15 minutes or contact support

**Staff account issues**
- Ask your manager to check your account status
- Your account may be deactivated

## Sales Not Showing

**Refresh the page**
- Press F5 or click the refresh button
- Check your internet connection

**Check the date filter**
- Make sure you are viewing the correct date
- Clear any filters applied

**Branch selection**
- Verify you are viewing the correct branch

## Printer Not Working

**Check connections**
- USB cable connected properly
- Printer turned on
- Paper loaded correctly

**Restart the printer**
- Turn off, wait 10 seconds, turn on

**Browser settings**
- Allow pop-ups for printing
- Try a different browser

## Barcode Scanner Issues

**Not scanning?**
- Clean the scanner lens
- Check USB connection
- Try scanning a different barcode

**Wrong product appearing**
- Barcode may be assigned to wrong product
- Check barcode settings in inventory

## Slow Performance

**Clear browser cache**
- Press Ctrl+Shift+Delete
- Clear cached images and files

**Check internet speed**
- Slow internet affects loading
- Try a different network if available',
'Quick fixes for the most common BVBooks issues.',
true, true, ARRAY['troubleshooting', 'help', 'issues', 'problems'], ARRAY['pos', 'settings']),

('Frequently Asked Questions', 'faq', 'a534216d-e472-4885-b7a4-f670447ad3d2',
'# Frequently Asked Questions

Answers to questions we hear often.

## General Questions

**Is my data secure?**
Yes. BVBooks uses bank-level encryption. Your data is stored securely in the cloud and backed up regularly.

**Can I access BVBooks on my phone?**
Yes. BVBooks works on any device with a web browser - phone, tablet, or computer.

**Do I need internet to use BVBooks?**
Yes, an internet connection is required. We are working on offline mode for future release.

## Pricing Questions

**Is there a free trial?**
Yes, all new accounts get 14 days free with full access to all features.

**Can I change my plan later?**
Yes, upgrade or downgrade anytime from Settings.

**What happens if I do not pay?**
Your account enters a grace period. You can still view data but cannot process sales until payment is made.

## Technical Questions

**What browsers work best?**
Chrome and Edge work best. Firefox and Safari also work well.

**Can I use my own barcode scanner?**
Yes, any USB barcode scanner that acts as a keyboard will work.

**How do I print receipts?**
Use any thermal receipt printer. Configure in Settings → Receipt Settings.

## Support Questions

**How do I contact support?**
Use the chat widget, email support@bvbooks.ng, or call our support line.

**What are support hours?**
We are available Monday-Friday 8am-6pm, Saturday 9am-2pm.

**Is training available?**
Yes, we offer free onboarding training for all new businesses.',
'Answers to the most common questions about BVBooks.',
true, true, ARRAY['faq', 'questions', 'answers', 'help'], ARRAY['help', 'settings']),

('Contacting BVBooks Support', 'contact-support', 'a534216d-e472-4885-b7a4-f670447ad3d2',
'# Contacting BVBooks Support

We are here to help you succeed.

## Ways to Reach Us

**Live Chat**
Click the chat widget in the bottom right corner for instant help. Our AI assistant can answer common questions immediately, and human support is available during business hours.

**Email**
Send us an email at support@bvbooks.ng. We respond within 24 hours on business days.

**Phone**
Call our support line for urgent issues. Phone support is available for Professional and Enterprise plans.

**WhatsApp**
Message us on WhatsApp for quick questions and updates.

## Before You Contact Us

Have this information ready:
- Your business name
- The issue you are experiencing
- Screenshots if applicable
- Steps you have already tried

## Support Hours

**Live Chat & Phone**
Monday - Friday: 8:00 AM - 6:00 PM
Saturday: 9:00 AM - 2:00 PM
Sunday: Closed

**Email**
Monitored 7 days a week. Response within 24 hours.

## Urgent Issues

For critical issues like:
- Cannot process any sales
- Payment system down
- Data access problems

Mark your message as URGENT for priority handling.

## Feature Requests

Have ideas to improve BVBooks? We love feedback! Use the chat to share your suggestions.',
'Get help from the BVBooks support team.',
true, false, ARRAY['support', 'contact', 'help', 'customer service'], ARRAY['help', 'support']);