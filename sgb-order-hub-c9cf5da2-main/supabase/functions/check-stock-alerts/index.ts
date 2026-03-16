import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Query low stock items
    const { data: lowStock, error } = await supabase
      .from('warehouse_inventory')
      .select('*, warehouses(warehouse_name, city), products(product_name)')
      .filter('stock_quantity', 'lte', supabase.rpc('get_reorder_level', {}))
      .limit(50);

    // Fallback: manual filter
    const { data: allInventory } = await supabase
      .from('warehouse_inventory')
      .select('*, warehouses(warehouse_name, city), products(product_name)');

    const alerts = (allInventory ?? []).filter(
      (item: any) => item.stock_quantity <= item.reorder_level,
    );

    if (alerts.length === 0) {
      return new Response(JSON.stringify({ message: 'All stock levels OK', alerts: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const FROM = 'whatsapp:+14155238886';
    const TO = 'whatsapp:+919110404193';

    const sent: string[] = [];

    for (const item of alerts) {
      const warehouseName = item.warehouses?.warehouse_name ?? 'Unknown Warehouse';
      const productName = item.products?.product_name ?? 'Unknown Product';
      const message =
        `⚠️ Low Stock Alert!\n\nWarehouse: ${warehouseName}\nProduct: ${productName}\nCurrent stock: ${item.stock_quantity} units\nReorder level: ${item.reorder_level} units\n\nPlease restock immediately! 🏭`;

      const formData = new URLSearchParams();
      formData.append('From', FROM);
      formData.append('To', TO);
      formData.append('Body', message);

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        },
      );

      if (res.ok) sent.push(`${warehouseName} — ${productName}`);
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent.length} alerts`, alerts: sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
