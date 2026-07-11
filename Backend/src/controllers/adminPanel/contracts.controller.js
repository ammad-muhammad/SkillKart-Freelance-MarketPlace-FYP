const Contract = require('../../models/Contract');
const ContractHistory = require('../../models/ContractHistory');
const Payment = require('../../models/Payment');
const TimeLog = require('../../models/TimeLog');
const { auditLog } = require('../../utils/adminAudit');
const { exportToCSV, exportToExcel, exportToPDF, sendExportResponse } = require('../../utils/exportHelper');

const CONTRACT_COLUMNS = [
  { key: '_id', label: 'ID' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'fixedPrice', label: 'Price' },
  { key: 'startedAt', label: 'Started' },
  { key: 'completedAt', label: 'Completed' }
];

const getContracts = async (req, res) => {
  try {
    const {
      search, status, type, clientId, freelancerId,
      dateFrom, dateTo, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (clientId) filter.clientId = clientId;
    if (freelancerId) filter.freelancerId = freelancerId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [contracts, total] = await Promise.all([
      Contract.find(filter)
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .populate('jobId', 'title')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Contract.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true, contracts,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load contracts' });
  }
};

const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('clientId', 'email firstName lastName')
      .populate('freelancerId', 'email firstName lastName')
      .populate('jobId', 'title budget')
      .lean();

    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const [history, timeLogs, payment] = await Promise.all([
      ContractHistory.find({ contractId: contract._id }).sort({ createdAt: -1 }).lean(),
      TimeLog.find({ contractId: contract._id }).sort({ startedAt: -1 }).lean(),
      Payment.findOne({ contractId: contract._id }).lean()
    ]);

    return res.status(200).json({ success: true, contract, history, timeLogs, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load contract' });
  }
};

const addContractNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Note is required' });

    await ContractHistory.create({
      contractId: req.params.id,
      action: 'admin_note',
      description: `[Admin Note] ${note}`,
      performedBy: req.admin.email
    });

    auditLog(req, {
      action: 'contract.note.added',
      category: 'contract',
      resource: 'Contract',
      resourceId: req.params.id,
      newValue: { note },
      severity: 'info'
    });

    return res.status(200).json({ success: true, message: 'Note added' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

const exportContracts = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const contracts = await Contract.find().sort({ createdAt: -1 }).lean();
    const buf = format === 'excel' ? await exportToExcel(contracts, CONTRACT_COLUMNS, 'Contracts')
              : format === 'pdf'   ? await exportToPDF(contracts, CONTRACT_COLUMNS, 'Contracts Export')
              : exportToCSV(contracts, CONTRACT_COLUMNS);
    auditLog(req, { action: `export.${format}`, category: 'export', resource: 'Contract', notes: `${contracts.length} contracts` });
    sendExportResponse(res, buf, format, 'contracts');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

module.exports = { getContracts, getContractById, addContractNote, exportContracts };
