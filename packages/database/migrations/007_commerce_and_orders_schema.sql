-- 007_commerce_and_orders_schema.sql
-- Commerce & Publishing: Print orders, line items, frozen print specifications, and fulfilment tracking

CREATE TABLE IF NOT EXISTS print_orders (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    user_id UUID NOT NULL,
    book_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- 'submitted', 'preflight_passed', 'in_production', 'shipped', 'delivered', 'cancelled'
    total_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    shipping_address JSONB NOT NULL DEFAULT '{}',
    print_spec JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES print_orders(id) ON DELETE CASCADE,
    book_id UUID NOT NULL,
    edition_hash VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fulfilment_records (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES print_orders(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL DEFAULT 'local_print_press',
    facility_location VARCHAR(100),
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast order tracking and member order history
CREATE INDEX IF NOT EXISTS idx_orders_space ON print_orders(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user ON print_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON print_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfilment_order ON fulfilment_records(order_id);
