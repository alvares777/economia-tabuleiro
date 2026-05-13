const router                      = require('express').Router();
const ctrl                        = require('../controllers/usersController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/active', requireAuth, ctrl.listActiveUsers);
router.get('/',       requireAuth, requireAdmin, ctrl.listUsers);
router.post('/',      requireAuth, requireAdmin, ctrl.createUser);
router.put('/:id',    requireAuth, requireAdmin, ctrl.updateUser);
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteUser);

module.exports = router;
