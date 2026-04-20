import { forwardRef } from 'react';
import { Sale } from '@/hooks/useSales';
import { format } from 'date-fns';

// HTML escape function to prevent XSS attacks
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate URL to prevent javascript: and other dangerous protocols
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'data:';
  } catch {
    return false;
  }
}

interface InvoicePrintProps {
  sale: Sale;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessLogo?: string | null;
  cashierName?: string;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(
  ({ sale, businessName = 'BVBooks Store', businessAddress = '123 Market Street, Lagos', businessPhone = '+234 801 234 5678', businessLogo, cashierName }, ref) => {
    return (
      <div ref={ref} className="p-4 bg-white text-black max-w-[80mm] mx-auto text-xs">
        {/* Header */}
        <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
          {businessLogo && (
            <div className="mb-2">
              <img src={businessLogo} alt="Logo" className="h-12 mx-auto object-contain" />
            </div>
          )}
          <h1 className="text-lg font-bold">{businessName}</h1>
          <p className="text-gray-600">{businessAddress}</p>
          <p className="text-gray-600">{businessPhone}</p>
        </div>

        {/* Invoice Details */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          <div className="flex justify-between">
            <span className="font-semibold">Invoice:</span>
            <span>{sale.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Payment:</span>
            <span>{sale.payment_method}</span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span className="font-semibold">Customer:</span>
              <span>{sale.customer.name}</span>
            </div>
          )}
          {cashierName && (
            <div className="flex justify-between">
              <span className="font-semibold">Cashier:</span>
              <span>{cashierName}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.sale_items?.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-1 max-w-[100px] truncate">{item.product_name}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">₦{Number(item.unit_price).toLocaleString()}</td>
                  <td className="text-right py-1">₦{Number(item.total_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₦{Number(sale.subtotal).toLocaleString()}</span>
          </div>
          {Number(sale.discount_amount) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-₦{Number(sale.discount_amount).toLocaleString()}</span>
            </div>
          )}
          {Number(sale.tax_amount) > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>₦{Number(sale.tax_amount).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-2">
            <span>TOTAL:</span>
            <span>₦{Number(sale.total_amount).toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600">
          <p>Thank you for your patronage!</p>
          <p className="text-xs">For support: {businessPhone}</p>
          <p className="text-xs mt-2">*** Powered by BVBooks ***</p>
        </div>
      </div>
    );
  }
);

InvoicePrint.displayName = 'InvoicePrint';

interface PrintInvoiceOptions {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessLogo?: string | null;
  showReceiptLogo?: boolean;
  showReceiptTax?: boolean;
  receiptFooter?: string | null;
  receiptPaperSize?: string;
  cashierName?: string;
}

// Detect Android for RawBT-compatible printing
function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

// Wait for all images in a document to load
function waitForImages(doc: Document): Promise<void> {
  const images = doc.querySelectorAll('img');
  if (images.length === 0) return Promise.resolve();
  return Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          // Fallback timeout per image
          setTimeout(resolve, 3000);
        })
    )
  ).then(() => {});
}

// Blob URL fallback: opens receipt in a new tab for system print
function printViaBlobFallback(htmlContent: string) {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      win.onload = () => {
        setTimeout(() => {
          win.print();
          URL.revokeObjectURL(blobUrl);
        }, 500);
      };
    } else {
      URL.revokeObjectURL(blobUrl);
      alert('Printing failed. Please allow pop-ups and try again.');
    }
  } catch {
    alert('Printing failed. Please try again or use a different device.');
  }
}

// Print via hidden iframe (works with RawBT on Android)
function printViaIframe(htmlContent: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    alert('Could not create print frame. Please try again.');
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  const triggerPrint = () => {
    // Wait for any images in the receipt to load first
    waitForImages(iframeDoc).then(() => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print failed:', e);
        // Fallback: open as Blob URL in a new tab
        printViaBlobFallback(htmlContent);
      }
      // Cleanup iframe after print spooler has time to process
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 5000);
    });
  };

  // Use onload event with a fallback timeout
  let loaded = false;
  iframe.onload = () => {
    if (loaded) return;
    loaded = true;
    triggerPrint();
  };
  // Fallback: if onload doesn't fire within 1s, proceed anyway
  setTimeout(() => {
    if (loaded) return;
    loaded = true;
    triggerPrint();
  }, 1000);
}

// Utility function to print invoice
export function printInvoice(sale: Sale, options?: PrintInvoiceOptions) {
  const paperSize = options?.receiptPaperSize || '80mm';
  const windowWidth = paperSize === 'A4' ? 800 : paperSize === '58mm' ? 300 : 400;

  const businessName = escapeHtml(options?.businessName) || 'Your Business';
  const businessAddress = escapeHtml(options?.businessAddress) || '';
  const businessPhone = escapeHtml(options?.businessPhone) || '';
  const businessLogo = options?.businessLogo || '';
  const isValidLogoUrl = isValidImageUrl(businessLogo);
  const showReceiptLogo = options?.showReceiptLogo ?? true;
  const showReceiptTax = options?.showReceiptTax ?? true;
  const receiptFooter = options?.receiptFooter ? escapeHtml(options.receiptFooter) : '';
  const cashierName = options?.cashierName ? escapeHtml(options.cashierName) : '';

  // Paper size settings
  const getPaperStyles = () => {
    switch (paperSize) {
      case '58mm':
        return { maxWidth: '58mm', fontSize: '10px', logoHeight: '36px' };
      case 'A4':
        return { maxWidth: '210mm', fontSize: '14px', logoHeight: '64px' };
      default: // 80mm
        return { maxWidth: '80mm', fontSize: '12px', logoHeight: '48px' };
    }
  };
  
  const paperStyles = getPaperStyles();

  // Escape all user-provided data to prevent XSS attacks
  const safeInvoiceNumber = escapeHtml(sale.invoice_number);
  const safePaymentMethod = escapeHtml(sale.payment_method);
  const safeCustomerName = sale.customer ? escapeHtml(sale.customer.name) : '';

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial Black', 'Helvetica Bold', Arial, sans-serif; 
            max-width: ${paperStyles.maxWidth}; 
            margin: 0 auto; 
            padding: 12px;
            font-size: ${paperStyles.fontSize};
            font-weight: 600;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
          .header h1 { font-size: 1.4em; margin-bottom: 6px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
          .header p { font-size: 0.95em; color: #000; font-weight: 600; margin: 2px 0; }
          .header img { height: ${paperStyles.logoHeight}; margin-bottom: 10px; object-fit: contain; }
          .details { border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
          .details p { display: flex; justify-content: space-between; margin: 5px 0; font-weight: 600; }
          .details p span:first-child { font-weight: 700; }
          .items table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .items th { text-align: left; border-bottom: 2px solid #000; padding: 6px 3px; font-size: 0.95em; font-weight: 800; text-transform: uppercase; }
          .items td { padding: 6px 3px; border-bottom: 1px solid #333; font-size: 0.95em; font-weight: 600; }
          .items td:nth-child(2), .items th:nth-child(2) { text-align: center; }
          .items td:nth-child(3), .items td:nth-child(4), .items th:nth-child(3), .items th:nth-child(4) { text-align: right; }
          .totals { border-top: 2px dashed #000; padding-top: 12px; margin-bottom: 12px; }
          .totals p { display: flex; justify-content: space-between; margin: 5px 0; font-weight: 600; }
          .totals .total { font-weight: 900; font-size: 1.3em; margin-top: 8px; border-top: 1px solid #000; padding-top: 8px; }
          .footer { text-align: center; border-top: 2px dashed #000; padding-top: 12px; font-size: 0.95em; color: #000; font-weight: 600; }
          .footer p { margin: 4px 0; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${showReceiptLogo && isValidLogoUrl ? `<img src="${businessLogo}" alt="Logo">` : ''}
          <h1>${businessName}</h1>
          ${businessAddress ? `<p>${businessAddress}</p>` : ''}
          ${businessPhone ? `<p>${businessPhone}</p>` : ''}
        </div>
        
        <div class="details">
          <p><span>Invoice:</span><span>${safeInvoiceNumber}</span></p>
          <p><span>Date:</span><span>${format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</span></p>
          <p><span>Payment:</span><span>${safePaymentMethod}</span></p>
          ${sale.customer ? `<p><span>Customer:</span><span>${safeCustomerName}</span></p>` : ''}
          ${cashierName ? `<p><span>Cashier:</span><span>${cashierName}</span></p>` : ''}
        </div>
        
        <div class="items">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.sale_items?.map(item => `
                <tr>
                  <td>${escapeHtml(item.product_name)}</td>
                  <td>${item.quantity}</td>
                  <td>₦${Number(item.unit_price).toLocaleString()}</td>
                  <td>₦${Number(item.total_price).toLocaleString()}</td>
                </tr>
                ${Number((item as any).discount) > 0 ? `<tr><td colspan="3" style="font-size:0.85em;color:#666;padding:0 3px 4px;">  Item discount</td><td style="text-align:right;font-size:0.85em;color:#c00;padding:0 3px 4px;">-₦${Number((item as any).discount).toLocaleString()}</td></tr>` : ''}
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="totals">
          <p><span>Subtotal:</span><span>₦${Number(sale.subtotal).toLocaleString()}</span></p>
          ${Number(sale.discount_amount) > 0 ? `<p><span>Discount:</span><span>-₦${Number(sale.discount_amount).toLocaleString()}</span></p>` : ''}
          ${showReceiptTax && Number(sale.tax_amount) > 0 ? `<p><span>Tax:</span><span>₦${Number(sale.tax_amount).toLocaleString()}</span></p>` : ''}
          <p class="total"><span>TOTAL:</span><span>₦${Number(sale.total_amount).toLocaleString()}</span></p>
        </div>
        
        <div class="footer">
          <p>${receiptFooter || 'Thank you for your patronage!'}</p>
          ${businessPhone ? `<p>For support: ${businessPhone}</p>` : ''}
          <p>*** Powered by BVBooks ***</p>
        </div>
        
        ${!isAndroid() ? '<script>window.onload = function() { window.print(); }</script>' : ''}
      </body>
    </html>
  `;

  if (isAndroid()) {
    // Use Blob URL in a new tab for Android — ensures RawBT and other
    // print-service apps capture the receipt content, not the parent page.
    printViaBlobFallback(content);
  } else {
    const printWindow = window.open('', '_blank', `width=${windowWidth},height=600`);
    if (!printWindow) {
      alert('Please allow popups to print receipts');
      return;
    }
    printWindow.document.write(content);
    printWindow.document.close();
  }
}
