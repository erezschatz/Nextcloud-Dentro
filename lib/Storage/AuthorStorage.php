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
        return false;
    }

    public function writeContent($content) {
        // check if file exists and write to it if possible
        try {
            try {
                $file = $this->storage->get('/dentro.opml');
            } catch(\OCP\Files\NotFoundException $e) {
                return 'File not found';
            }
            $file->putContent($content);
            return true;
        } catch(\OCP\Files\NotPermittedException $e) {
            return 'Cant write to file';
        }
        return false;
    }
}
