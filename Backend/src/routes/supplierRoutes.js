const express = require('express');
const router = express.Router();
const ctr = require('../controllers/supplierController');

router.get('/', ctr.listSuppliers);
router.get('/:id', ctr.getSupplier);
router.post('/', ctr.createSupplier);
router.put('/:id', ctr.updateSupplier);
router.delete('/:id', ctr.deleteSupplier);

module.exports = router;
