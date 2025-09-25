const express = require('express');
const router = express.Router();
const ctr = require('../controllers/materialController');

router.get('/', ctr.listMaterials);
router.get('/:id', ctr.getMaterial);
router.post('/', ctr.createMaterial);
router.put('/:id', ctr.updateMaterial);
router.delete('/:id', ctr.deleteMaterial);

// stock movements
router.post('/:id/receive', ctr.receiveStock);
router.post('/:id/consume', ctr.consumeStock);

module.exports = router;
