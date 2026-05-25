import { OrderService } from './src/services/OrderService';

async function main() {
  try {
    const orders = await OrderService.getOrders();
    console.log(JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error('Error fetching orders:', e);
  }
}

main();
