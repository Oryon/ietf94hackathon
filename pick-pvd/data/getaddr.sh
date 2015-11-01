echo "Executing getaddr.sh"

OUT="$1"
ID="0"
function all() {
  echo "Adding all combinations"
  IP4S=$(ip -4 addr | grep scope | awk '{ print $2; }' | sed "s-/.*--")
  IP6S=$(ip -6 addr | grep scope | awk '{ print $2; }' | sed "s-/.*--")
  for ip4 in $IP4S; do
    for ip6 in $IP6S; do
      echo "pvd-$ID,PVD $ID -> $ip6-$ip4,$ip6-$ip4" >> "$OUT"
      ID=$((ID+1))
    done;
  done;
}

LOOKUP=""
function lookup() {
  echo "Looking up $1"
  a=$(host "$1")
  for k in $a; do
    k=$(echo $k | grep "arpa")
    if [ "$k" != "" ]; then
      a=$k
      break;
    fi
  done

  a="_pvd."$a"."
  echo "a: $a"
  b=$(dig -t ptr $a)
  c=""
  if [ "$?" != "0" ]; then
    echo "No PVD found"
    LOOKUP="\"n=NoPVD\" \"id=$ID\""
  else
    echo "Returned: $b"
    b=$(dig -t ptr $a | grep -v ";" | grep "PTR" | awk '{ print $5; }')
    c=$(dig -t txt $b | grep -v ";" | grep "TXT" | awk '{ print $5 " " $6; }' )
    LOOKUP=$(echo "$c" | sed 's/"//g')
    if [ "$LOOKUP" = "" ]; then
	echo "No PVD found (but tried)"
        LOOKUP="n=NoPVD id=$ID"
    fi
  fi

  ID=$((ID+1))

  #b=$(dig -t ptr $a | grep -v ";" | grep "PTR" | awk '{ print $5; }')
  #c=$(dig -t txt $b | grep -v ";" | grep "TXT" | awk '{ print $5 $6; }' )
  #PTR_REQ="_pvd.0.1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. 123 IN	PTR foo.example.com."
  #TXT_REQ="foo.example.com.	123	IN	TXT	\"n=foo\" \"id=$ID\""
  #b=$(echo "$PTR_REQ" | grep -v ";" | grep "PTR" | awk '{ print $5; }')
  #c=$(echo "$TXT_REQ" | grep -v ";" | grep "TXT" | awk '{ print $5 " " $6; }' )
  #LOOKUP=$(echo "$c" | sed 's/"//g')
  

  #echo "b: $b"
  #echo "c: "$c
  echo "LOOKUP=$LOOKUP"
}

function mif() {
  echo "Get MIF through DNS"
  IP6S=$(ip -6 addr | grep global | awk '{ print $2; }' | sed "s-/.*--")
  for ip in $IP6S; do
    lookup "$ip"
    n=$(echo "$LOOKUP" | awk '{ print $1; }' | sed "s/.*=//")
    id=$(echo "$LOOKUP" | awk '{ print $2; }' | sed "s/.*=//")
    echo "dns-$id,$n ($ip),$ip" >> "$OUT"
    echo "n=$n    ---  id=$id"
  done;
}

function ip4() {
  echo "Get IPv4 PVDs"
  IP4S=$(ip -4 addr | grep global | awk '{ print $2; }' | sed "s-/.*--")
  for ip in $IP4S; do
    echo "v4-$ip,Crappy v4 ($ip),$ip" >> "$OUT"
  done;
}

echo "" > "$OUT"

mif
ip4

echo "------------FILE: $OUT --------"
cat "$OUT"
echo "-----------------------------"
