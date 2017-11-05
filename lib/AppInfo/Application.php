<?php
namespace OCA\Dentro\AppInfo;

use \OCP\AppFramework\App;

use \OCA\Dentro\Storage\AuthorStorage;


class Application extends App {

    public function __construct(array $urlParams=array()){
        parent::__construct('dentro', $urlParams);

        $container = $this->getContainer();

        /**
         * Storage Layer
         */
        $container->registerService('AuthorStorage', function($c) {
            return new AuthorStorage($c->query('RootStorage'));
        });

        $container->registerService('RootStorage', function($c) {
            return $c->query('ServerContainer')->getRootFolder();
        });
    }
}
