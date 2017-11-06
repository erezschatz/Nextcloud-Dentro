<?php
namespace OCA\Dentro\Controller;

use OCP\IRequest;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Controller;
use \OCA\Dentro\AppInfo\Application;

class PageController extends Controller {
	private $userId;

	public function __construct($AppName, IRequest $request, $UserId){
		parent::__construct($AppName, $request);
		$this->userId = $UserId;
	}

	/**
	 * CAUTION: the @Stuff turns off security checks; for this page no admin is
	 *          required and no CSRF check. If you don't know what CSRF is, read
	 *          it up in the docs or you might create a security hole. This is
	 *          basically the only required method to add this exemption, don't
	 *          add it to any other method if you don't exactly know what it does
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function index() {
		return new TemplateResponse('dentro', 'index');  // templates/index.php
	}
	
	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
    public function getOpml() {
        $app = new Application();
        $container = $app->getContainer();
        return array("opml" => $container->query('AuthorStorage')->getContent());
	}
	
	
	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
    public function storeOpml($content) {
        $app = new Application();
        $container = $app->getContainer();
        return array("status" => $container->query('AuthorStorage')->writeContent($content));
	}
}
