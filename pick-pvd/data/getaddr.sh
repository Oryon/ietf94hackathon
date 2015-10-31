IPS=$(ip addr | grep scope | awk '{ print $2; }' | sed "s-/.*--")
ID="0"
echo "" > "$1"
for ip in $IPS; do
	echo "pvd-$ID,PVD $ID -> $ip,$ip" >> "$1"
	ID=$((ID+1))
done

