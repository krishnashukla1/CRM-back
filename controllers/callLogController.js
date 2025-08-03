const CallLog = require('../models/CallLog');
const mongoose = require('mongoose');

// ✅ Create new call log
exports.createCallLog = async (req, res) => {
  try {
    let {
      employeeId,
      reasonForCall,
      typeOfCall,
      callCategory,
      callDescription,
      wasSaleConverted,
      profitAmount,
      reasonForNoSale,
      customerName,
      customerEmail,
      customerPhone,
      language
    } = req.body;

    // ✅ Basic validation
    if (
      !employeeId ||
      !reasonForCall ||
      !typeOfCall ||
      !callDescription ||
      !wasSaleConverted ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !language
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Enforce logic based on sale status
    if (wasSaleConverted === 'Yes') {
      reasonForNoSale = '';
      if (!profitAmount || isNaN(profitAmount)) {
        return res.status(400).json({ message: 'Profit amount required for successful sale' });
      }
    } else if (wasSaleConverted === 'No') {
      profitAmount = 0;
      if (!reasonForNoSale) {
        return res.status(400).json({ message: 'Reason for no sale is required' });
      }
    }

    const callLog = new CallLog({
      employeeId,
      reasonForCall,
      typeOfCall,
    //   callCategory: typeOfCall === 'Sales Inquiry' ? callCategory : '',
    callCategory: typeOfCall === 'Sales Inquiry' ? callCategory : undefined,

      callDescription,
      wasSaleConverted,
      profitAmount,
      reasonForNoSale,
      customerName,
      customerEmail,
      customerPhone,
      language
    });

    await callLog.save();

    res.status(201).json({ message: '✅ Call log saved successfully', data: callLog });

  } catch (error) {
    console.error('❌ Error saving call log:', error);
    res.status(500).json({ message: 'Server error while saving call log' });
  }
};


exports.getAllCallLogs = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default 10 items per page
    const skip = (page - 1) * limit;

    // Get total count of documents
    const total = await CallLog.countDocuments();

    // Fetch paginated logs
    const logs = await CallLog.find()
      .populate('employeeId', 'name email')
      .skip(skip)
      .limit(limit);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ 
      pagination: null,
      success: false,
      message: 'Server error while fetching call logs',
      error: error.message 
    });
  }
};
// ✅ Get call logs for one employee
exports.getCallLogsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const logs = await CallLog.find({ employeeId });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee call logs' });
  }
};


exports.getCallSummaryStats = async (req, res) => {
  try {
    // Total number of call logs
    const totalCalls = await CallLog.countDocuments();

    // Total number of successful sales
    const totalSales = await CallLog.countDocuments({ wasSaleConverted: 'Yes' });

    // Total profit from sales
    const totalProfitResult = await CallLog.aggregate([
      { $match: { wasSaleConverted: 'Yes' } },
      { $group: { _id: null, total: { $sum: '$profitAmount' } } }
    ]);
    const totalProfit = totalProfitResult[0]?.total || 0;

    // Top call categories (only for Sales Inquiry)
    const topCallCategories = await CallLog.aggregate([
      {
        $match: {
          typeOfCall: 'Sales Inquiry',
          callCategory: { $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: '$callCategory',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // ✅ Send success response
    res.status(200).json({
      status: 'success',
      message: 'Call summary stats fetched successfully',
      data: {
        totalCalls,
        totalSales,
        totalProfit,
        topCallCategories
      }
    });

  } catch (error) {
    console.error('❌ FULL ERROR STACK:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching employee call logs'
    });
  }
};



exports.getTodaySummary = async (req, res) => {
  const { employeeId } = req.params;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  try {
    const logs = await CallLog.find({
      employeeId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    const totalCalls = logs.length;
    const salesConverted = logs.filter(log => log.wasSaleConverted === 'Yes');
    const rejections = logs.filter(log => log.wasSaleConverted === 'No');
    const languageBarriers = logs.filter(log => log.reasonForNoSale === 'Language barrier');
    const profitEarned = salesConverted.reduce((sum, log) => sum + (log.profitAmount || 0), 0);

    // Count reasons for no sale
    const reasonCounts = {};
    rejections.forEach(log => {
      const reason = log.reasonForNoSale || 'Unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    res.json({
      totalCalls,
      salesCount: salesConverted.length,
      rejectionCount: rejections.length,
      profitEarned,
      languageBarriers: languageBarriers.length,
      reasonBreakdown: reasonCounts,
    });
  } catch (err) {
    console.error('Get Call Summary Error:', err);
    res.status(500).json({ message: 'Failed to get summary' });
  }
};


