bind.so: bind.c
	gcc -nostartfiles -fpic -shared bind.c -o bind.so -ldl -D_GNU_SOURCE

all: bind.so
