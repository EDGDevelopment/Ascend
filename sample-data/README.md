# Sample data

Synthetic monthly figures for trying the Financial model page (Upload a spreadsheet). None of it is real.
All files end in September 2026.

| File | Months | Tests |
| --- | --- | --- |
| cafe-36-months.csv | 36 | Typical seasonal business, with expenses |
| cafe-month-name-format.csv | 36 | Months written as "Oct 2023" |
| bakery-us-dates.csv | 36 | Months written as 10/1/2023 |
| bakery-dollar-signs.csv | 36 | Money written as "$21,000" |
| salon-24-months-no-expenses.csv | 24 | Revenue only (expenses are optional for businesses) |
| restaurant-covid-style-dip.csv | 48 | A five-month collapse to 45% of normal, then recovery. Should trigger alerts |
| online-store-fast-growth.csv | 30 | About 3% growth a month, peak in December |
| landscaping-very-seasonal.csv | 36 | Strong summer peak, winter trough |
| shop-declining.csv | 36 | Revenue falling about 1% a month, thin margin |
| subscription-steady.csv | 36 | Flat seasonality, low noise: forecast should be very accurate |
| nonprofit-36-months.csv | 36 | Pick "Non-profit" first (expenses are required for it) |
| EDGE-too-short-6-months.csv | 6 | Should be rejected: needs at least 12 months |
| EDGE-gap-in-months.csv | 35 | Should be rejected: a month is missing |
| EDGE-negative-revenue.csv | 24 | Should be rejected: one month has negative revenue |
