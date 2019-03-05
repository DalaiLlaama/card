#!/bin/bash

# Set default email & domain name
email=$EMAIL; [[ -n "$email" ]] || email=noreply@gmail.com
domain=$DOMAINNAME; [[ -n "$domain" ]] || domain=localhost
echo "domain=$domain email=$email"

letsencrypt=/etc/letsencrypt/live
devcerts=$letsencrypt/localhost
mkdir -p $devcerts
mkdir -p /etc/certs
mkdir -p /var/www/letsencrypt

# Provide a message indicating that we're still waiting for everything to wake up
function loading_msg {
  while true # unix.stackexchange.com/a/37762
  do echo 'Waiting for the rest of the app to wake up..' | nc -lk -p 80
  done > /dev/null
}
loading_msg &
loading_pid="$!"

if [[ "$MODE" == "dev" ]]
then

  provider=indra_ethprovider:8545
  echo "Waiting for $provider to wake up... (have you run npm start in the indra repo yet?)"
  bash wait_for.sh -t 60 $provider 2> /dev/null
  while ! curl -s http://$provider > /dev/null
  do sleep 1
  done

  hub=indra_hub:8080
  echo "Waiting for $hub to wake up... (have you run npm start in the indra repo yet?)"
  bash wait_for.sh -t 60 $hub 2> /dev/null
  while ! curl -s http://$hub > /dev/null
  do sleep 1
  done

  server=server:3000
  echo "Waiting for $server to wake up..."
  bash wait_for.sh -t 60 $server 2> /dev/null
  while ! curl -s http://$server > /dev/null
  do sleep 1
  done

else

  provider=hub.connext.network/api/eth
  echo "Waiting for $provider to wake up... (have you deployed indra yet?)"
  while ! curl -s https://$provider > /dev/null
  do sleep 1
  done

  hub=hub.connext.network/api/hub
  echo "Waiting for $hub to wake up... (have you deployed indra yet?)"
  while ! curl -s https://$hub > /dev/null
  do sleep 1
  done

fi

# Kill the loading message
kill "$loading_pid" && pkill nc

if [[ "$domain" == "localhost" && ! -f "$devcerts/privkey.pem" ]]
then
  echo "Developing locally, generating self-signed certs"
  openssl req -x509 -newkey rsa:4096 -keyout $devcerts/privkey.pem -out $devcerts/fullchain.pem -days 365 -nodes -subj '/CN=localhost'
fi

if [[ ! -f "$letsencrypt/$domain/privkey.pem" ]]
then
  echo "Couldn't find certs for $domain, using certbot to initialize those now.."
  certbot certonly --standalone -m $email --agree-tos --no-eff-email -d $domain -n
  [[ $? -eq 0 ]] || sleep 9999 # FREEZE! Don't pester eff & get throttled
fi

echo "Using certs for $domain"
ln -sf $letsencrypt/$domain/privkey.pem /etc/certs/privkey.pem
ln -sf $letsencrypt/$domain/fullchain.pem /etc/certs/fullchain.pem

# Hack way to implement variables in the nginx.conf file
sed -i 's/$hostname/'"$domain"'/' /etc/nginx/nginx.conf
sed -i 's|$ethprovider|'"$ETH_RPC_URL"'|' /etc/nginx/nginx.conf

# periodically fork off & see if our certs need to be renewed
function renewcerts {
  while true
  do
    echo -n "Preparing to renew certs... "
    if [[ -d "/etc/letsencrypt/live/$domain" ]]
    then
      echo -n "Found certs to renew for $domain... "
      certbot renew --webroot -w /var/www/letsencrypt/ -n
      echo "Done!"
    fi
    sleep 48h
  done
}

if [[ "$domain" != "localhost" ]]
then
  renewcerts &
fi

sleep 3 # give renewcerts a sec to do it's first check
echo "Entrypoint finished, executing nginx..."; echo
exec nginx
