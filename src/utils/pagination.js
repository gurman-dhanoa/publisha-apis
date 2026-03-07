const getPaginationData = (total, page, limit) => {
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    pages: Math.ceil(total / limit),
  };
};

module.exports = getPaginationData;