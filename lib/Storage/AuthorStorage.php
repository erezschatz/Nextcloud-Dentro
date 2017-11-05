<?php
namespace OCA\Dentro\Storage;

class AuthorStorage {

    private $storage;

    public function __construct($storage){
        $this->storage = $storage;
    }

    public function getContent() {
        // check if file exists and read from it if possible
        try {
            $file = $this->storage->get('/dentro.opml');
            if($file instanceof \OCP\Files\File) {
                return $file->getContent();
            } else {
                return 'Can not read from folder';
            }
        } catch(\OCP\Files\NotFoundException $e) {
            return 'File does not exist';
        }
    }
}
