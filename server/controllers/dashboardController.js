const db = require('../database/db');

class DashboardController {
  async getDashboardData(req, res) {
    try {
      const user = req.user;
      const userRole = user?.role || 'owner';
      const userId = user?.id;

      // 1. KPI Counts
      const totalInvoices = db.get('SELECT COUNT(*) as count FROM invoices').count;
      const totalVendors = db.get('SELECT COUNT(*) as count FROM vendors').count;
      const totalItems = db.get('SELECT COUNT(*) as count FROM invoice_items').count;
      
      const totalPurchaseValueResult = db.get('SELECT COALESCE(SUM(total), 0) as total FROM invoices');
      const totalPurchaseValue = totalPurchaseValueResult ? totalPurchaseValueResult.total : 0;

      // Pending invoices (matches 'Pending Approval' or unpaid)
      const pendingResult = db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount 
        FROM invoices 
        WHERE status LIKE 'Pending%' OR (status = 'Approved' AND (amount_paid IS NULL OR amount_paid = 0))
      `);
      const pendingInvoices = pendingResult.count;
      const pendingAmount = pendingResult.amount;

      // Approved / Paid invoices
      const approvedResult = db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount 
        FROM invoices 
        WHERE status = 'Paid' OR (status = 'Approved' AND amount_paid > 0)
      `);
      const approvedInvoices = approvedResult.count;
      const approvedAmount = approvedResult.amount;

      // 2. Pending Invoices Queue (urgent for Owner to review/approve and pay)
      const pendingInvoicesList = db.query(`
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.due_date,
          i.total,
          i.amount_paid,
          i.paid,
          i.status,
          i.created_at,
          v.vendor_name,
          v.vendor_type,
          u.name as created_by_name,
          (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        LEFT JOIN users u ON i.created_by_user_id = u.id
        WHERE i.status LIKE 'Pending%' OR (i.status = 'Approved' AND (i.amount_paid IS NULL OR i.amount_paid = 0))
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT 10
      `);

      // 3. Recent Invoices
      const isStaffUser = (userRole === 'staff' || userRole === 'employee') && userId;
      const recentInvoicesSql = `
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.due_date,
          i.total,
          i.total_gst,
          i.tax,
          i.amount_paid,
          i.paid,
          i.status,
          i.payment_method,
          i.payment_reference,
          i.paid_at,
          i.created_at,
          v.vendor_name,
          v.vendor_type,
          COALESCE(u.name, 'Store Staff') as created_by_name,
          appr.name as approved_by_name,
          (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        LEFT JOIN users u ON i.created_by_user_id = u.id
        LEFT JOIN users appr ON i.approved_by_user_id = appr.id
        ${isStaffUser ? 'WHERE i.created_by_user_id = ?' : ''}
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT 8
      `;
      const recentInvoices = isStaffUser
        ? db.query(recentInvoicesSql, [userId])
        : db.query(recentInvoicesSql);

      // 4. Employee-specific stats
      const employeeStats = {
        mySubmissionsCount: userId
          ? db.get('SELECT COUNT(*) as count FROM invoices WHERE created_by_user_id = ?', [userId]).count
          : totalInvoices,
        myPendingCount: userId
          ? db.get("SELECT COUNT(*) as count FROM invoices WHERE created_by_user_id = ? AND (status LIKE 'Pending%' OR (status = 'Approved' AND (amount_paid IS NULL OR amount_paid = 0)))", [userId]).count
          : pendingInvoices,
        myApprovedCount: userId
          ? db.get("SELECT COUNT(*) as count FROM invoices WHERE created_by_user_id = ? AND (status = 'Paid' OR (status = 'Approved' AND amount_paid > 0))", [userId]).count
          : approvedInvoices,
        todayUploads: db.get("SELECT COUNT(*) as count FROM invoices WHERE DATE(created_at) = DATE('now')").count,
        totalItemsDigitized: totalItems,
      };

      // 5. Payment Methods Breakdown (for Owner executive view)
      const paymentMethods = db.query(`
        SELECT 
          COALESCE(payment_method, 'Direct Account') as method,
          COUNT(id) as count,
          COALESCE(SUM(total), 0) as amount
        FROM invoices
        WHERE (status = 'Paid' OR (status LIKE 'Approved%' AND amount_paid > 0)) AND payment_method IS NOT NULL
        GROUP BY payment_method
        ORDER BY amount DESC
      `);

      // 6. Category Breakdown (for Pie/Doughnut Chart)
      const categoryBreakdown = db.query(`
        SELECT 
          COALESCE(c.category_name, 'Uncategorized') as category_name,
          COALESCE(SUM(ii.total_price), 0) as total_amount,
          COUNT(ii.id) as item_count
        FROM invoice_items ii
        LEFT JOIN categories c ON ii.category_id = c.id
        GROUP BY c.category_name
        ORDER BY total_amount DESC
      `);

      // 7. Purchases by Vendor (for Bar Chart)
      const vendorBreakdown = db.query(`
        SELECT 
          COALESCE(v.vendor_name, 'Unknown Vendor') as vendor_name,
          COALESCE(SUM(i.total), 0) as total_amount,
          COUNT(i.id) as invoice_count
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        GROUP BY v.id, v.vendor_name
        ORDER BY total_amount DESC
        LIMIT 8
      `);

      // 8. Monthly Purchases Trend (for Area / Line Chart)
      const monthlyPurchases = db.query(`
        SELECT 
          SUBSTR(COALESCE(invoice_date, created_at), 1, 7) as month,
          COALESCE(SUM(total), 0) as total_amount,
          COUNT(id) as invoice_count
        FROM invoices
        WHERE SUBSTR(COALESCE(invoice_date, created_at), 1, 7) IS NOT NULL
        GROUP BY month
        ORDER BY month ASC
        LIMIT 12
      `);

      // 9. Classification accuracy stats
      const classificationStats = db.get(`
        SELECT 
          AVG(classification_confidence) as avg_confidence,
          SUM(CASE WHEN classification_confidence < 0.70 THEN 1 ELSE 0 END) as low_confidence_count,
          COUNT(*) as total_classified
        FROM invoice_items
      `);

      return res.json({
        success: true,
        data: {
          role: userRole,
          metrics: {
            totalInvoices,
            totalVendors,
            totalItems,
            totalPurchaseValue,
            pendingInvoices,
            pendingAmount,
            approvedInvoices,
            approvedAmount
          },
          pendingInvoicesList,
          recentInvoices,
          employeeStats,
          paymentMethods,
          charts: {
            categoryBreakdown,
            vendorBreakdown,
            monthlyPurchases
          },
          classificationStats: {
            avgConfidence: classificationStats?.avg_confidence ? Number((classificationStats.avg_confidence * 100).toFixed(1)) : 95.0,
            lowConfidenceCount: classificationStats?.low_confidence_count || 0,
            totalClassified: classificationStats?.total_classified || 0
          }
        }
      });
    } catch (error) {
      console.error('[DashboardController] getDashboardData error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new DashboardController();
