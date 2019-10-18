.PHONY: test cypress

install:
	npm install

run:
	docker run --rm -d -p 8080:80 -v $(PWD):/usr/share/nginx/html nginx:alpine

test:
	npm run test

cypress:
	npm run cypress

update-libs:
	./bin/updateLibs.sh
