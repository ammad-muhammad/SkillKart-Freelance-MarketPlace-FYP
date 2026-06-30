const SkillNode = require('../models/SkillNode');
const SkillRelationship = require('../models/SkillRelationship');
const { sendSuccess, sendCreated, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/apiError');
const taxonomy = require('../services/taxonomy.service');

const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * GET /admin/taxonomy/nodes
 * List all nodes with pagination, type filter, status filter, and keyword search.
 */
exports.listNodes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type, status = 'active', q } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { aliases: { $regex: q, $options: 'i' } },
      { synonyms: { $regex: q, $options: 'i' } }
    ];
  }

  const [nodes, total] = await Promise.all([
    SkillNode.find(query).skip(skip).limit(Number(limit)).sort({ name: 1 }).lean(),
    SkillNode.countDocuments(query)
  ]);

  sendSuccess(res, {
    message: 'Nodes retrieved successfully',
    data: { nodes, page: Number(page), limit: Number(limit), total }
  });
});

/**
 * POST /admin/taxonomy/nodes
 * Create a new skill node.
 */
exports.createNode = asyncHandler(async (req, res) => {
  const { name, type, description, aliases, synonyms, weight, icon, color } = req.body;

  if (!name) throw new BadRequestError('Name is required');

  const existing = await SkillNode.findOne({ name });
  if (existing) throw new BadRequestError(`Node with name "${name}" already exists`);

  const node = await SkillNode.create({
    name,
    slug: slugify(name),
    type: type || 'skill',
    description: description || '',
    aliases: aliases || [],
    synonyms: synonyms || [],
    weight: weight ?? 1.0,
    icon: icon || '',
    color: color || '',
    status: 'active'
  });

  taxonomy.invalidateCache();

  sendCreated(res, 'Skill node created successfully', { node });
});

/**
 * PATCH /admin/taxonomy/nodes/:id
 * Update an existing skill node.
 */
exports.updateNode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const node = await SkillNode.findById(id);
  if (!node) throw new NotFoundError('Node not found');

  if (updates.name && updates.name !== node.name) {
    const existing = await SkillNode.findOne({ name: updates.name });
    if (existing) throw new BadRequestError(`Node with name "${updates.name}" already exists`);
    updates.slug = slugify(updates.name);
  }

  node.set(updates);
  await node.save();

  taxonomy.invalidateCache();

  sendSuccess(res, { message: 'Node updated successfully', data: { node } });
});

/**
 * POST /admin/taxonomy/relationships
 * Connect two nodes with a relationship.
 */
exports.createRelationship = asyncHandler(async (req, res) => {
  const { from, to, type, weight, note } = req.body;

  if (!from || !to || !type) {
    throw new BadRequestError('from, to, and type are required');
  }

  const [fromNode, toNode] = await Promise.all([
    SkillNode.findById(from),
    SkillNode.findById(to)
  ]);

  if (!fromNode) throw new NotFoundError(`Source node (from) not found`);
  if (!toNode) throw new NotFoundError(`Target node (to) not found`);

  const existing = await SkillRelationship.findOne({ from, to, type });
  if (existing) throw new BadRequestError('Relationship of this type already exists between these nodes');

  const rel = await SkillRelationship.create({
    from,
    to,
    type,
    weight: weight ?? 1.0,
    metadata: { note: note || '' },
    createdBy: req.user._id
  });

  // Automatically add complementary inverse edge if it's BELONGS_TO -> CHILD
  if (type === 'BELONGS_TO') {
    await SkillRelationship.findOneAndUpdate(
      { from: to, to: from, type: 'CHILD' },
      { $set: { weight: weight ?? 1.0 } },
      { upsert: true }
    );
  }

  taxonomy.invalidateCache();

  sendCreated(res, 'Nodes connected successfully', { relationship: rel });
});

/**
 * DELETE /admin/taxonomy/relationships
 * Disconnect two nodes (remove relationship).
 */
exports.deleteRelationship = asyncHandler(async (req, res) => {
  const { from, to, type } = req.body;

  if (!from || !to || !type) {
    throw new BadRequestError('from, to, and type are required to disconnect nodes');
  }

  const result = await SkillRelationship.deleteOne({ from, to, type });
  if (result.deletedCount === 0) {
    throw new NotFoundError('No matching relationship found to delete');
  }

  // If we disconnected BELONGS_TO, also remove the complementary CHILD edge
  if (type === 'BELONGS_TO') {
    await SkillRelationship.deleteOne({ from: to, to: from, type: 'CHILD' });
  }

  taxonomy.invalidateCache();

  sendSuccess(res, { message: 'Nodes disconnected successfully' });
});

/**
 * POST /admin/taxonomy/merge
 * Merge two duplicate nodes (sourceId -> targetId).
 */
exports.mergeNodes = asyncHandler(async (req, res) => {
  const { sourceId, targetId } = req.body;

  if (!sourceId || !targetId) {
    throw new BadRequestError('sourceId and targetId are required for merge');
  }

  const [source, target] = await Promise.all([
    SkillNode.findById(sourceId),
    SkillNode.findById(targetId)
  ]);

  if (!source) throw new NotFoundError('Source node not found');
  if (!target) throw new NotFoundError('Target node not found');

  await taxonomy.mergeNodes(sourceId, targetId);

  sendSuccess(res, { message: `Node "${source.name}" merged successfully into "${target.name}"` });
});

/**
 * GET /admin/taxonomy/proposals
 * List all pending review taxonomy proposals.
 */
exports.listProposals = asyncHandler(async (req, res) => {
  const { status = 'pending_review', page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [proposals, total] = await Promise.all([
    TaxonomyProposal.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    TaxonomyProposal.countDocuments({ status })
  ]);

  sendSuccess(res, {
    message: 'Taxonomy proposals retrieved',
    data: { proposals, page: Number(page), limit: Number(limit), total }
  });
});

/**
 * POST /admin/taxonomy/proposals/:id/review
 * Approve or reject a taxonomy proposal.
 */
exports.reviewProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, name, type, description, aliases, synonyms, weight, icon, color, relationships } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new BadRequestError('Status must be approved or rejected');
  }

  const proposal = await TaxonomyProposal.findById(id);
  if (!proposal) throw new NotFoundError('Proposal not found');

  if (proposal.status !== 'pending_review') {
    throw new BadRequestError(`Proposal has already been reviewed: "${proposal.status}"`);
  }

  if (status === 'approved') {
    // 1. Double check node doesn't exist
    const finalName = name || proposal.name;
    const finalType = type || proposal.type;
    
    let existingNode = await SkillNode.findOne({ name: finalName });
    
    if (!existingNode) {
      existingNode = await SkillNode.create({
        name: finalName,
        slug: slugify(finalName),
        type: finalType,
        description: description ?? proposal.description,
        aliases: aliases ?? proposal.aliases,
        synonyms: synonyms ?? proposal.synonyms,
        weight: weight ?? proposal.weight ?? 1.0,
        icon: icon ?? proposal.icon,
        color: color ?? proposal.color,
        status: 'active'
      });
    }

    // 2. Connect relationships
    const relsToCreate = relationships || proposal.relationships || [];
    for (const rel of relsToCreate) {
      // Find the target node
      const targetNode = await SkillNode.findOne({ name: rel.targetName });
      if (targetNode) {
        // Create direct edge
        await SkillRelationship.findOneAndUpdate(
          { from: existingNode._id, to: targetNode._id, type: rel.type },
          { $set: { weight: rel.weight ?? 1.0 } },
          { upsert: true }
        );
        // Create child inverse if applicable
        if (rel.type === 'BELONGS_TO') {
          await SkillRelationship.findOneAndUpdate(
            { from: targetNode._id, to: existingNode._id, type: 'CHILD' },
            { $set: { weight: rel.weight ?? 1.0 } },
            { upsert: true }
          );
        }
      }
    }
  }

  // 3. Update proposal status
  proposal.status = status;
  proposal.reviewedBy = req.user._id;
  proposal.reviewedAt = new Date();
  
  // Overwrite attributes to match what was actually approved
  if (status === 'approved') {
    if (name) proposal.name = name;
    if (type) proposal.type = type;
    if (description !== undefined) proposal.description = description;
    if (aliases !== undefined) proposal.aliases = aliases;
    if (synonyms !== undefined) proposal.synonyms = synonyms;
    if (relationships !== undefined) proposal.relationships = relationships;
  }

  await proposal.save();

  taxonomy.invalidateCache();

  sendSuccess(res, { message: `Proposal successfully ${status}` });
});
