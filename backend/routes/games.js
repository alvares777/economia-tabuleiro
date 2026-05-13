const router          = require('express').Router();
const ctrl            = require('../controllers/gamesController');
const { requireAuth } = require('../middleware/auth');

router.get('/',               requireAuth, ctrl.listGames);
router.get('/:gameId',        requireAuth, ctrl.loadGame);
router.post('/',              requireAuth, ctrl.saveGame);
router.delete('/:gameId',     requireAuth, ctrl.deleteGame);
router.patch('/:gameId/name', requireAuth, ctrl.renameGame);

module.exports = router;
