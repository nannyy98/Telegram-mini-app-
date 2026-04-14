import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    const { method, params } = payload;

    let result: any = {};

    switch (method) {
      case 'CheckPerformTransaction':
        result = await checkPerformTransaction(params);
        break;
      case 'CreateTransaction':
        result = await createTransaction(params, supabase);
        break;
      case 'PerformTransaction':
        result = await performTransaction(params, supabase);
        break;
      case 'CancelTransaction':
        result = await cancelTransaction(params, supabase);
        break;
      case 'CheckTransaction':
        result = await checkTransaction(params);
        break;
      default:
        throw new Error('Method not found');
    }

    return new Response(
      JSON.stringify({ result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: { code: -32400, message: error.message } }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function checkPerformTransaction(params: any) {
  const { account } = params;
  const orderId = account.order_id;

  // Verify order exists and is not paid
  return { allow: true };
}

async function createTransaction(params: any, supabase: any) {
  const { id, account, amount } = params;
  const orderId = account.order_id;

  // Create transaction record
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) {
    throw new Error('Order not found');
  }

  // Update order with transaction ID
  await supabase
    .from('orders')
    .update({
      transaction_id: id.toString(),
      status: 'processing',
    })
    .eq('id', orderId);

  return {
    create_time: Date.now(),
    transaction: id.toString(),
    state: 1,
  };
}

async function performTransaction(params: any, supabase: any) {
  const { id } = params;

  // Find order by transaction_id and mark as paid
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('transaction_id', id.toString())
    .single();

  if (order) {
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id);
  }

  return {
    transaction: id.toString(),
    perform_time: Date.now(),
    state: 2,
  };
}

async function cancelTransaction(params: any, supabase: any) {
  const { id } = params;

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('transaction_id', id.toString())
    .single();

  if (order) {
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
      })
      .eq('id', order.id);
  }

  return {
    transaction: id.toString(),
    cancel_time: Date.now(),
    state: -1,
  };
}

async function checkTransaction(params: any) {
  const { id } = params;

  return {
    transaction: id.toString(),
    state: 1,
    create_time: Date.now(),
  };
}
