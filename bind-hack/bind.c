/*
   Copyright (C) 2000  Daniel Ryde

   This library is free software; you can redistribute it and/or
   modify it under the terms of the GNU Lesser General Public
   License as published by the Free Software Foundation; either
   version 2.1 of the License, or (at your option) any later version.

   This library is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
   Lesser General Public License for more details.
*/

/*
   LD_PRELOAD library to make bind and connect to use a virtual
   IP address as localaddress. Specified via the enviroment
   variable BIND_ADDR.

   Compile on Linux with:
   gcc -nostartfiles -fpic -shared bind.c -o bind.so -ldl -D_GNU_SOURCE


   Example in bash to make inetd only listen to the localhost
   lo interface, thus disabling remote connections and only
   enable to/from localhost:

   BIND_ADDR="127.0.0.1" LD_PRELOAD=./bind.so /sbin/inetd


   Example in bash to use your virtual IP as your outgoing
   sourceaddress for ircII:

   BIND_ADDR="your-virt-ip" LD_PRELOAD=./bind.so ircII

   Note that you have to set up your servers virtual IP first.


   This program was made by Daniel Ryde
   email: daniel@ryde.net
   web:   http://www.ryde.net/

   TODO: I would like to extend it to the accept calls too, like a
   general tcp-wrapper. Also like an junkbuster for web-banners.
   For libc5 you need to replace socklen_t with int.
*/



#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <dlfcn.h>
#include <errno.h>
#include <string.h>
#include <time.h>

#define INIT_GRACE_TIME 2

int (*real_bind)(int, const struct sockaddr *, socklen_t);
int (*real_connect)(int, const struct sockaddr *, socklen_t);

clock_t begin;
double time_spent() {
  return (double)(clock() - begin) / CLOCKS_PER_SEC;
}

void _init (void)
{
  const char *err;
  real_bind = dlsym (RTLD_NEXT, "bind");
  if ((err = dlerror ()) != NULL) {
    fprintf (stderr, "dlsym (bind): %s\n", err);
  }

  real_connect = dlsym (RTLD_NEXT, "connect");
  if ((err = dlerror ()) != NULL) {
    fprintf (stderr, "dlsym (connect): %s\n", err);
  }

  begin = clock();
}

int get_address(struct sockaddr_in6 *l)
{
  char *bind_addr = NULL, buff[1024];
  char *bind_addr_file = getenv("BIND_ADDR_FILE");
  int i;
  char is_ipv6 = 0;
  if (bind_addr_file) {
    FILE *f;
    if(!(f = fopen(bind_addr_file, "r"))) {
      printf("Can't open file\n");
    } else {
      i = fread (buff, 1, 1024, f);
      if (i > 0) {
        int j;
        for(j = 0; j<i; j++) {
          if(buff[j] == ':') {
            is_ipv6 = 1;
          }
          if(buff[j] == '\n') {
            buff[j] = 0;
            break;
          }
        }
        buff[j] = 0;
        bind_addr = buff;
      }
    }
  }

  if (bind_addr == NULL) {
    bind_addr = getenv("BIND_ADDR");
  }

  if (bind_addr) {
    if(is_ipv6) {
      char str[50];
      struct sockaddr_in6 *in6 = (struct sockaddr_in6 *)l;
      memset(in6, 0, sizeof(*in6));
      inet_pton(AF_INET6, bind_addr, &in6->sin6_addr);
      in6->sin6_family = AF_INET6;
      inet_ntop(AF_INET6, &in6->sin6_addr, str, 50);
      printf("(address = %s)  ", str);
    } else {
      struct sockaddr_in *local_sockaddr_in = (struct sockaddr_in *)l;
      unsigned long bind_addr_saddr = inet_addr(bind_addr);
      local_sockaddr_in->sin_family = AF_INET;
      local_sockaddr_in->sin_addr.s_addr = bind_addr_saddr;
      local_sockaddr_in->sin_port = htons (0);
      printf("(address = %s)  ", inet_ntoa(local_sockaddr_in->sin_addr));
    }
    return 0;
  }
  printf("Could not find address\n");
  return -1;
}

int bind (int fd, const struct sockaddr *sk, socklen_t sl)
{
  static struct sockaddr_in *lsk_in;
  static struct sockaddr_in6 skaddr;

  lsk_in = (struct sockaddr_in *)sk;
  printf("bind: %d %s:%d\n", fd, inet_ntoa(lsk_in->sin_addr), ntohs (lsk_in->sin_port));
  if (!get_address(&skaddr) && lsk_in->sin_family == skaddr.sin6_family) {
    int i = real_bind(fd, (struct sockaddr*)&skaddr, sizeof (skaddr));
    printf("Bind returned %d: %s\n", i, strerror(errno));
    return i;
  } else {
    printf("We don't want this one\n");
  }
  return real_bind (fd, sk, sl);
}

int connect (int fd, const struct sockaddr *sk, socklen_t sl)
{
  static struct sockaddr_in *rsk_in;
  static struct sockaddr_in6 skaddr;
  
  rsk_in = (struct sockaddr_in *)sk;
  printf("connect: %d %s:%d ", fd, inet_ntoa(rsk_in->sin_addr), ntohs (rsk_in->sin_port));
  if (!get_address(&skaddr)) {
    if (rsk_in->sin_family == skaddr.sin6_family) {
      int i = real_bind(fd, (struct sockaddr *)&skaddr, sizeof(skaddr));
      printf("real_bind -> %d: %s\n", i, (i)?strerror(errno):"ok");
      if(i)
        return real_connect (fd, 0, 0);
    } else if (time_spent() < INIT_GRACE_TIME) {
      printf("Grace time\n");
    } else {
      printf("Wrong address family\n");
      return real_connect (fd, 0, 0);
    }
  }
  return real_connect (fd, sk, sl);
}

