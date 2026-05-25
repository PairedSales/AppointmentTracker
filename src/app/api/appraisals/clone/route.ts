import { NextResponse } from 'next/server';
import { OrderService } from '@/services/OrderService';
import crypto from 'crypto';

const autoFormatAddress = (addressStr: string): string => {
  if (!addressStr) return '';
  const clean = addressStr.trim();
  
  const suffixes = [
    'st', 'street', 'rd', 'road', 'dr', 'drive', 'ave', 'avenue', 
    'ln', 'lane', 'blvd', 'boulevard', 'ct', 'court', 'pl', 'place', 
    'wy', 'way', 'ter', 'terrace', 'cir', 'circle', 'hwy', 'highway', 
    'pkwy', 'parkway', 'loop'
  ];

  const suffixPattern = new RegExp(
    `^(.*\\b(${suffixes.join('|')})\\b[.,\\s]*)(.*)$`, 
    'i'
  );
  
  const match = clean.match(suffixPattern);
  if (match) {
    let streetPart = match[1].trim();
    const remaining = match[3].trim();
    
    if (streetPart.endsWith(',')) {
      streetPart = streetPart.slice(0, -1).trim();
    }
    
    let cityPart = remaining;
    let zipPart = '';
    
    const zipMatch = cityPart.match(/\b\d{5}\b/);
    if (zipMatch) {
      zipPart = zipMatch[0];
      cityPart = cityPart.replace(/\b\d{5}\b/, '').trim();
    }
    
    cityPart = cityPart.replace(/,?\s*\b(il|illinois)\b/i, '').trim();
    
    if (cityPart.endsWith(',')) {
      cityPart = cityPart.slice(0, -1).trim();
    }
    if (cityPart.startsWith(',')) {
      cityPart = cityPart.slice(1).trim();
    }
    
    if (!cityPart) {
      if (!clean.toUpperCase().includes('IL')) {
        return `${clean}, IL`;
      }
      return clean;
    }
    
    let formatted = `${streetPart}, ${cityPart}, IL`;
    if (zipPart) {
      formatted += ` ${zipPart}`;
    }
    return formatted;
  }
  
  if (!clean.toLowerCase().includes('il') && !clean.toLowerCase().includes('illinois')) {
    return `${clean}, IL`;
  }
  
  return clean;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, newAddress, newDueDate } = body;

    if (!id || !newAddress || !newDueDate) {
      return NextResponse.json(
        { error: 'Source appraisal ID, new address, and new due date are required.' },
        { status: 400 }
      );
    }

    const source = await OrderService.getOrderById(id);
    if (!source) {
      return NextResponse.json({ error: 'Source appraisal not found' }, { status: 404 });
    }

    const formattedAddress = autoFormatAddress(newAddress);
    const isHybrid = (source.type || '').toLowerCase().includes('hybrid');
    
    let finalColor = 'blue';
    let finalStats = 'Unscheduled';
    
    if (isHybrid) {
      finalColor = 'brown';
      finalStats = source.stats || '';
    }

    const newId = crypto.randomUUID();

    const created = await OrderService.createOrder({
      id: newId,
      address: formattedAddress,
      city: source.city,
      type: source.type,
      inspection_date: '',
      inspection_time: '',
      due_date: newDueDate,
      stats: finalStats,
      client: source.client || 'Unknown', // legacy prop passed to createOrder
      fee: source.fee,
      color_category: finalColor,
      lender_order_number: '',
      client_order_number: '',
      appraised_value: null,
      effective_date: null,
      fha_case_number: '',
      sale_price: null,
      contact_name: source.contact_name,
      contact_phone: source.contact_phone
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('API POST clone appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
