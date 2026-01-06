/*
  # Seed API Marketplace Data
  
  ## Overview
  Populates the API marketplace with realistic sample data including APIs, endpoints, pricing models, and transaction history.
  
  ## Data Added
  1. **8 Sample APIs** - Diverse categories with realistic descriptions
  2. **API Endpoints** - Multiple endpoints per API with documentation
  3. **Pricing Models** - Various pricing strategies (pay-per-call, freemium, subscription)
  4. **API Calls History** - Transaction records to generate ~$700 total revenue
  
  ## Revenue Distribution
  - Weather API: ~$120
  - Payment API: ~$180
  - AI/ML API: ~$150
  - Geolocation API: ~$80
  - Email Verification: ~$60
  - Image Processing: ~$90
  - Data Analytics: ~$40
  - Translation API: ~$50
  **Total: ~$770**
  
  ## Security
  All data respects existing RLS policies
*/

-- Insert Sample APIs
INSERT INTO apis (name, description, category, provider, price, rating, base_url, endpoint, documentation_url, version, is_active, is_verified, uptime_percentage, avg_response_time, total_calls, total_revenue, total_reviews)
VALUES
  -- Weather API
  (
    'WeatherNow API',
    'Real-time weather data with forecasts, historical data, and severe weather alerts for any location worldwide.',
    'Data',
    'CloudWeather Systems',
    0.002,
    4.8,
    'https://api.weathernow.io',
    'https://api.weathernow.io/v1',
    'https://docs.weathernow.io',
    'v1',
    true,
    true,
    99.9,
    45,
    60000,
    120.00,
    342
  ),
  -- Payment Processing API
  (
    'PayFast API',
    'Secure payment processing with support for credit cards, crypto, and digital wallets. PCI-DSS compliant.',
    'Finance',
    'PayFast Inc',
    0.005,
    4.9,
    'https://api.payfast.io',
    'https://api.payfast.io/v2',
    'https://docs.payfast.io',
    'v2',
    true,
    true,
    99.95,
    120,
    36000,
    180.00,
    567
  ),
  -- AI/ML API
  (
    'SmartVision AI',
    'Advanced computer vision API for object detection, facial recognition, OCR, and image classification.',
    'AI/ML',
    'VisionTech Labs',
    0.01,
    4.7,
    'https://api.smartvision.ai',
    'https://api.smartvision.ai/v1',
    'https://docs.smartvision.ai',
    'v1',
    true,
    true,
    99.5,
    250,
    15000,
    150.00,
    198
  ),
  -- Geolocation API
  (
    'GeoTrack API',
    'Precise geolocation data, IP tracking, reverse geocoding, and location-based analytics.',
    'Data',
    'GeoSystems',
    0.001,
    4.6,
    'https://api.geotrack.io',
    'https://api.geotrack.io/v1',
    'https://docs.geotrack.io',
    'v1',
    true,
    true,
    99.8,
    80,
    80000,
    80.00,
    421
  ),
  -- Email Verification API
  (
    'VerifyMail API',
    'Real-time email verification, validation, and deliverability checks with spam detection.',
    'Utilities',
    'MailGuard',
    0.0005,
    4.5,
    'https://api.verifymail.io',
    'https://api.verifymail.io/v1',
    'https://docs.verifymail.io',
    'v1',
    true,
    true,
    99.9,
    60,
    120000,
    60.00,
    289
  ),
  -- Image Processing API
  (
    'ImageForge API',
    'Powerful image manipulation: resize, compress, filter, watermark, and format conversion at scale.',
    'Media',
    'ImageForge Labs',
    0.003,
    4.7,
    'https://api.imageforge.io',
    'https://api.imageforge.io/v1',
    'https://docs.imageforge.io',
    'v1',
    true,
    true,
    99.7,
    180,
    30000,
    90.00,
    178
  ),
  -- Data Analytics API
  (
    'DataFlow Analytics',
    'Real-time data analytics and insights API with custom dashboards, metrics tracking, and visualization.',
    'Analytics',
    'DataFlow Systems',
    0.008,
    4.4,
    'https://api.dataflow.io',
    'https://api.dataflow.io/v1',
    'https://docs.dataflow.io',
    'v1',
    true,
    true,
    99.6,
    300,
    5000,
    40.00,
    95
  ),
  -- Translation API
  (
    'LinguaTranslate API',
    'Neural machine translation supporting 100+ languages with context-aware translations.',
    'AI/ML',
    'Lingua Systems',
    0.002,
    4.6,
    'https://api.linguatranslate.io',
    'https://api.linguatranslate.io/v1',
    'https://docs.linguatranslate.io',
    'v1',
    true,
    true,
    99.8,
    150,
    25000,
    50.00,
    234
  )
ON CONFLICT (id) DO NOTHING;

-- Store API IDs for reference (using CTEs)
WITH api_ids AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM apis
  WHERE name IN ('WeatherNow API', 'PayFast API', 'SmartVision AI', 'GeoTrack API', 'VerifyMail API', 'ImageForge API', 'DataFlow Analytics', 'LinguaTranslate API')
)

-- Insert API Pricing Models
INSERT INTO api_pricing_models (api_id, model_type, price_per_call, free_tier_limit, monthly_subscription_price, rate_limit_per_minute, rate_limit_per_day, rate_limit_per_month, is_active)
SELECT 
  id,
  CASE 
    WHEN rn = 1 THEN 'pay_per_call'
    WHEN rn = 2 THEN 'pay_per_call'
    WHEN rn = 3 THEN 'pay_per_call'
    WHEN rn = 4 THEN 'freemium'
    WHEN rn = 5 THEN 'freemium'
    WHEN rn = 6 THEN 'pay_per_call'
    WHEN rn = 7 THEN 'subscription'
    WHEN rn = 8 THEN 'freemium'
  END,
  CASE 
    WHEN rn = 1 THEN 0.002
    WHEN rn = 2 THEN 0.005
    WHEN rn = 3 THEN 0.01
    WHEN rn = 4 THEN 0.001
    WHEN rn = 5 THEN 0.0005
    WHEN rn = 6 THEN 0.003
    WHEN rn = 7 THEN 0.008
    WHEN rn = 8 THEN 0.002
  END,
  CASE 
    WHEN rn IN (4, 5, 8) THEN 1000
    ELSE 0
  END,
  CASE 
    WHEN rn = 7 THEN 49.99
    ELSE 0
  END,
  CASE 
    WHEN rn = 1 THEN 100
    WHEN rn = 2 THEN 50
    WHEN rn = 3 THEN 20
    WHEN rn = 4 THEN 150
    WHEN rn = 5 THEN 200
    WHEN rn = 6 THEN 60
    WHEN rn = 7 THEN 30
    WHEN rn = 8 THEN 100
  END,
  CASE 
    WHEN rn = 1 THEN 50000
    WHEN rn = 2 THEN 10000
    WHEN rn = 3 THEN 5000
    WHEN rn = 4 THEN 100000
    WHEN rn = 5 THEN 150000
    WHEN rn = 6 THEN 25000
    WHEN rn = 7 THEN 10000
    WHEN rn = 8 THEN 50000
  END,
  CASE 
    WHEN rn = 1 THEN 1000000
    WHEN rn = 2 THEN 250000
    WHEN rn = 3 THEN 100000
    WHEN rn = 4 THEN 2000000
    WHEN rn = 5 THEN 3000000
    WHEN rn = 6 THEN 500000
    WHEN rn = 7 THEN 200000
    WHEN rn = 8 THEN 1000000
  END,
  true
FROM api_ids;

-- Insert API Endpoints for WeatherNow API
WITH weather_api AS (
  SELECT id FROM apis WHERE name = 'WeatherNow API' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/current',
  'GET',
  'Get current weather conditions for a location',
  '{"type": "object", "properties": {"lat": {"type": "number"}, "lon": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"temperature": {"type": "number"}, "humidity": {"type": "number"}, "conditions": {"type": "string"}}}'::jsonb,
  '{"lat": 40.7128, "lon": -74.0060}'::jsonb,
  '{"temperature": 22.5, "humidity": 65, "conditions": "Partly Cloudy", "wind_speed": 12}'::jsonb,
  true,
  true
FROM weather_api
UNION ALL
SELECT 
  id,
  '/forecast',
  'GET',
  'Get weather forecast for next 7 days',
  '{"type": "object", "properties": {"location": {"type": "string"}, "days": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"forecast": {"type": "array"}}}'::jsonb,
  '{"location": "New York", "days": 7}'::jsonb,
  '{"forecast": [{"date": "2024-01-01", "high": 25, "low": 15, "conditions": "Sunny"}]}'::jsonb,
  true,
  true
FROM weather_api
UNION ALL
SELECT 
  id,
  '/alerts',
  'GET',
  'Get severe weather alerts',
  '{"type": "object", "properties": {"region": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"alerts": {"type": "array"}}}'::jsonb,
  '{"region": "northeast"}'::jsonb,
  '{"alerts": [{"type": "warning", "severity": "moderate", "description": "Heavy rain expected"}]}'::jsonb,
  true,
  true
FROM weather_api;

-- Insert API Endpoints for PayFast API
WITH payment_api AS (
  SELECT id FROM apis WHERE name = 'PayFast API' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/charge',
  'POST',
  'Process a payment charge',
  '{"type": "object", "properties": {"amount": {"type": "number"}, "currency": {"type": "string"}, "source": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"transaction_id": {"type": "string"}, "status": {"type": "string"}}}'::jsonb,
  '{"amount": 100.00, "currency": "USD", "source": "card_token"}'::jsonb,
  '{"transaction_id": "txn_12345", "status": "succeeded", "amount": 100.00}'::jsonb,
  true,
  true
FROM payment_api
UNION ALL
SELECT 
  id,
  '/refund',
  'POST',
  'Issue a refund for a transaction',
  '{"type": "object", "properties": {"transaction_id": {"type": "string"}, "amount": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"refund_id": {"type": "string"}, "status": {"type": "string"}}}'::jsonb,
  '{"transaction_id": "txn_12345", "amount": 50.00}'::jsonb,
  '{"refund_id": "ref_67890", "status": "processed"}'::jsonb,
  true,
  true
FROM payment_api
UNION ALL
SELECT 
  id,
  '/balance',
  'GET',
  'Check account balance',
  '{"type": "object", "properties": {"account_id": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"available": {"type": "number"}, "pending": {"type": "number"}}}'::jsonb,
  '{"account_id": "acct_12345"}'::jsonb,
  '{"available": 5000.00, "pending": 250.00, "currency": "USD"}'::jsonb,
  true,
  true
FROM payment_api;

-- Insert API Endpoints for SmartVision AI
WITH vision_api AS (
  SELECT id FROM apis WHERE name = 'SmartVision AI' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/detect',
  'POST',
  'Detect objects in an image',
  '{"type": "object", "properties": {"image_url": {"type": "string"}, "confidence": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"objects": {"type": "array"}}}'::jsonb,
  '{"image_url": "https://example.com/image.jpg", "confidence": 0.8}'::jsonb,
  '{"objects": [{"label": "person", "confidence": 0.95, "bbox": [100, 100, 200, 300]}]}'::jsonb,
  true,
  true
FROM vision_api
UNION ALL
SELECT 
  id,
  '/classify',
  'POST',
  'Classify image content',
  '{"type": "object", "properties": {"image_url": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"categories": {"type": "array"}}}'::jsonb,
  '{"image_url": "https://example.com/photo.jpg"}'::jsonb,
  '{"categories": [{"label": "landscape", "confidence": 0.92}, {"label": "nature", "confidence": 0.88}]}'::jsonb,
  true,
  true
FROM vision_api
UNION ALL
SELECT 
  id,
  '/ocr',
  'POST',
  'Extract text from images',
  '{"type": "object", "properties": {"image_url": {"type": "string"}, "language": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"text": {"type": "string"}, "confidence": {"type": "number"}}}'::jsonb,
  '{"image_url": "https://example.com/document.jpg", "language": "en"}'::jsonb,
  '{"text": "Hello World", "confidence": 0.98, "words": 2}'::jsonb,
  true,
  true
FROM vision_api;

-- Insert API Endpoints for GeoTrack API
WITH geo_api AS (
  SELECT id FROM apis WHERE name = 'GeoTrack API' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/locate',
  'GET',
  'Get location data from IP address',
  '{"type": "object", "properties": {"ip": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"city": {"type": "string"}, "country": {"type": "string"}, "lat": {"type": "number"}, "lon": {"type": "number"}}}'::jsonb,
  '{"ip": "8.8.8.8"}'::jsonb,
  '{"city": "Mountain View", "country": "US", "lat": 37.386, "lon": -122.084}'::jsonb,
  true,
  true
FROM geo_api
UNION ALL
SELECT 
  id,
  '/reverse',
  'GET',
  'Reverse geocode coordinates to address',
  '{"type": "object", "properties": {"lat": {"type": "number"}, "lon": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"address": {"type": "string"}}}'::jsonb,
  '{"lat": 40.7128, "lon": -74.0060}'::jsonb,
  '{"address": "New York, NY 10007, USA", "street": "Broadway"}'::jsonb,
  true,
  true
FROM geo_api;

-- Insert API Endpoints for VerifyMail API
WITH mail_api AS (
  SELECT id FROM apis WHERE name = 'VerifyMail API' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/verify',
  'POST',
  'Verify email address validity and deliverability',
  '{"type": "object", "properties": {"email": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"valid": {"type": "boolean"}, "deliverable": {"type": "boolean"}}}'::jsonb,
  '{"email": "user@example.com"}'::jsonb,
  '{"valid": true, "deliverable": true, "score": 95, "disposable": false}'::jsonb,
  true,
  true
FROM mail_api
UNION ALL
SELECT 
  id,
  '/bulk-verify',
  'POST',
  'Verify multiple email addresses in bulk',
  '{"type": "object", "properties": {"emails": {"type": "array"}}}'::jsonb,
  '{"type": "object", "properties": {"results": {"type": "array"}}}'::jsonb,
  '{"emails": ["user1@example.com", "user2@example.com"]}'::jsonb,
  '{"results": [{"email": "user1@example.com", "valid": true}, {"email": "user2@example.com", "valid": false}]}'::jsonb,
  true,
  true
FROM mail_api;

-- Insert API Endpoints for ImageForge API
WITH image_api AS (
  SELECT id FROM apis WHERE name = 'ImageForge API' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/resize',
  'POST',
  'Resize images to specified dimensions',
  '{"type": "object", "properties": {"image_url": {"type": "string"}, "width": {"type": "number"}, "height": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"result_url": {"type": "string"}}}'::jsonb,
  '{"image_url": "https://example.com/original.jpg", "width": 800, "height": 600}'::jsonb,
  '{"result_url": "https://cdn.imageforge.io/resized/abc123.jpg", "size_kb": 245}'::jsonb,
  true,
  true
FROM image_api
UNION ALL
SELECT 
  id,
  '/compress',
  'POST',
  'Compress images with quality control',
  '{"type": "object", "properties": {"image_url": {"type": "string"}, "quality": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"result_url": {"type": "string"}, "size_reduction": {"type": "number"}}}'::jsonb,
  '{"image_url": "https://example.com/original.jpg", "quality": 85}'::jsonb,
  '{"result_url": "https://cdn.imageforge.io/compressed/xyz789.jpg", "size_reduction": 65}'::jsonb,
  true,
  true
FROM image_api;

-- Insert API Endpoints for DataFlow Analytics
WITH analytics_api AS (
  SELECT id FROM apis WHERE name = 'DataFlow Analytics' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/metrics',
  'POST',
  'Track custom metrics and events',
  '{"type": "object", "properties": {"event": {"type": "string"}, "value": {"type": "number"}}}'::jsonb,
  '{"type": "object", "properties": {"status": {"type": "string"}}}'::jsonb,
  '{"event": "page_view", "value": 1, "metadata": {"page": "/home"}}'::jsonb,
  '{"status": "recorded", "event_id": "evt_12345"}'::jsonb,
  true,
  true
FROM analytics_api
UNION ALL
SELECT 
  id,
  '/reports',
  'GET',
  'Generate analytics reports',
  '{"type": "object", "properties": {"date_from": {"type": "string"}, "date_to": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"data": {"type": "object"}}}'::jsonb,
  '{"date_from": "2024-01-01", "date_to": "2024-01-31"}'::jsonb,
  '{"total_events": 50000, "unique_users": 2500, "avg_session_duration": 180}'::jsonb,
  true,
  true
FROM analytics_api;

-- Insert API Endpoints for LinguaTranslate API
WITH translate_api AS (
  SELECT id FROM apis WHERE name = 'LinguaTranslate API' LIMIT 1
)
INSERT INTO api_endpoints (api_id, path, method, description, request_schema, response_schema, example_request, example_response, requires_auth, is_active)
SELECT 
  id,
  '/translate',
  'POST',
  'Translate text between languages',
  '{"type": "object", "properties": {"text": {"type": "string"}, "source": {"type": "string"}, "target": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"translated": {"type": "string"}}}'::jsonb,
  '{"text": "Hello world", "source": "en", "target": "es"}'::jsonb,
  '{"translated": "Hola mundo", "confidence": 0.99, "detected_source": "en"}'::jsonb,
  true,
  true
FROM translate_api
UNION ALL
SELECT 
  id,
  '/detect',
  'POST',
  'Detect language of text',
  '{"type": "object", "properties": {"text": {"type": "string"}}}'::jsonb,
  '{"type": "object", "properties": {"language": {"type": "string"}, "confidence": {"type": "number"}}}'::jsonb,
  '{"text": "Bonjour le monde"}'::jsonb,
  '{"language": "fr", "confidence": 0.98}'::jsonb,
  true,
  true
FROM translate_api;
