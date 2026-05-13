const router          = require('express').Router();
const ctrl            = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login',    ctrl.login);
router.post('/register', ctrl.register);
router.get('/me',        requireAuth, ctrl.getMe);
router.put('/me',        requireAuth, ctrl.updateMe);

module.exports = router;
