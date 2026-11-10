# Test container isolation

Test runs execute customer-supplied Docker images. Those containers are untrusted: anything
they can reach on the network, they can attack. This page lists what the platform enforces
on its own and what an operator has to configure on the host.

## Enforced by the worker

| Control | Behaviour |
| --- | --- |
| Image source | The image must pull successfully from its registry. A failed pull fails the run. Images in `WORKER_LOCAL_IMAGE_ALLOWLIST` (comma-separated, exact names) may fall back to the local cache; leave it empty in production. |
| Capabilities | All Linux capabilities are dropped and `no-new-privileges` is set. |
| Resources | Memory, CPU and PID limits per container. |
| Host access | No `host.docker.internal` route unless `ALLOW_HOST_GATEWAY=true` (development compose only). |
| Network | When `TEST_CONTAINER_NETWORK` is set, test containers attach to that network instead of Docker's default bridge. The worker creates it if missing, with inter-container traffic disabled, so concurrent runs cannot reach each other. |

## Operator steps for production

These are not applied automatically, because they depend on the host.

> **Where settings go:** the deploy workflow (`.github/workflows/deploy.yml`) rewrites
> `~/agnox/.env` on the VPS from GitHub repository secrets on every push to `main`.
> Edits made to `.env` by hand are lost on the next deploy. Set the values below as
> repository secrets (Settings → Secrets and variables → Actions) instead. A secret that
> is not set is written as an empty value, which keeps the previous behaviour.

### 1. Put test containers on their own network

As repository secrets:

```bash
TEST_CONTAINER_NETWORK=agnox-test-runs
TEST_CONTAINER_SUBNET=172.30.0.0/24   # any range unused on the host
```

Restart the workers. Check with `docker network inspect agnox-test-runs`.

### 2. Block internal destinations from that network

Docker does not filter outbound traffic from a bridge network, so the cloud metadata
service and private ranges stay reachable until the host firewall drops them. Add the
rules to the `DOCKER-USER` chain, which Docker evaluates before its own rules:

```bash
SUBNET=172.30.0.0/24

# Cloud metadata and link-local
iptables -I DOCKER-USER -s "$SUBNET" -d 169.254.0.0/16 -j DROP
# Private networks (other Docker networks, the VPC, the host's LAN)
iptables -I DOCKER-USER -s "$SUBNET" -d 10.0.0.0/8 -j DROP
iptables -I DOCKER-USER -s "$SUBNET" -d 172.16.0.0/12 -j DROP
iptables -I DOCKER-USER -s "$SUBNET" -d 192.168.0.0/16 -j DROP
# Services listening on the host itself (traffic to the bridge gateway uses INPUT)
iptables -I INPUT -s "$SUBNET" -j DROP
```

Persist them with your distribution's tool (for example `netfilter-persistent save`).
DNS keeps working when the host resolver is public; if containers use Docker's embedded
resolver on a private address, allow UDP and TCP port 53 to it above the DROP rules.

Tests that target a private address (a staging site inside the same VPC, for example)
stop working once these rules are in place. Allow the specific destination with an
`ACCEPT` rule inserted above the DROP rules.

### 3. Require credentials on RabbitMQ and Redis

Both services are only exposed on the internal compose network, but they should not
accept unauthenticated connections from anything that reaches that network.

As repository secrets (the two URLs are existing secrets; update them in the same change):

```bash
RABBITMQ_USER=agnox
RABBITMQ_PASSWORD=<openssl rand -hex 24>
REDIS_PASSWORD=<openssl rand -hex 24>

PLATFORM_RABBITMQ_URL=amqp://agnox:<rabbitmq password>@rabbitmq:5672
PLATFORM_REDIS_URL=redis://:<redis password>@redis:6379
```

Notes:

- `RABBITMQ_USER` / `RABBITMQ_PASSWORD` only create the user when the broker starts with
  an empty data directory. On a broker that already has data, create the user by hand and
  remove `guest`:

  ```bash
  docker exec automation-rabbitmq rabbitmqctl add_user agnox '<password>'
  docker exec automation-rabbitmq rabbitmqctl set_permissions -p / agnox '.*' '.*' '.*'
  docker exec automation-rabbitmq rabbitmqctl delete_user guest
  ```

- Update all five secrets before the deploy that should apply them. A producer or
  worker with the old URL cannot connect once the password is set.
- With `REDIS_PASSWORD` empty, Redis runs without authentication, as before.

### 4. Reverse proxy hops

`TRUST_PROXY_HOPS=1` (the production compose default) tells the API that one proxy sits
in front of it, so rate limits and login lockouts see the real client address. This
matches the current setup: the API's DNS name points straight at the VPS, where
nginx-proxy-manager terminates TLS. If another
proxy or CDN is added in front of nginx-proxy-manager, raise the value to match. Leave it
empty when the API port is reached directly: the header is then ignored and cannot be
spoofed.

## Not covered

The worker still controls Docker through the host's socket. A compromise of the worker
process is a compromise of the host. Moving to a socket proxy or a sandboxed runtime
(gVisor, rootless Docker) is tracked separately.
