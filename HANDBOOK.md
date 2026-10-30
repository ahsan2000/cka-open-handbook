# CKA Open Handbook

By Ahsan Nawaz. Original educational material: CC BY 4.0. Research checked October 30, 2026.

Independent preparation; no passing guarantee. Use disposable labs. Official exam fee is separate. See the live Linux Foundation FAQ and candidate handbook before booking.

## Foundations

### Linux, YAML & a fast terminal

Kubernetes administration combines Linux processes, networking and declarative configuration. Know SSH, sudo, systemd, file permissions, pipes, grep, curl and a terminal editor. YAML uses spaces: a list item begins with a dash; nested fields must align. apiVersion, kind, metadata and spec identify and describe an object. kubectl talks to the API server using your kubeconfig.

1. Practice editing a file with vi: i inserts, Esc exits insert mode, :wq saves, :q! discards. Use :set paste when pasting YAML if needed.
2. Install kubectl using the official installation instructions for your OS. Practice completion and use kubectl explain to discover fields.
3. Generate a Pod manifest, inspect it, validate it against a disposable cluster and apply it.

```
alias k=kubectl
source <(kubectl completion bash)
complete -o default -F __start_kubectl k
kubectl run web --image=nginx:stable --dry-run=client -o yaml > web.yaml
kubectl explain pod.spec.containers --recursive
kubectl apply --dry-run=server -f web.yaml
kubectl apply -f web.yaml
kubectl get pod web -o wide
```

**Verify:** Explain what metadata.name and spec.containers do. Confirm the Pod is Ready, then delete only your practice Pod with kubectl delete pod web.

**Watch out:** Client dry-run generates objects; it does not validate admission policy or cluster-side behavior. A running container is not necessarily Ready.

Documentation: https://kubernetes.io/docs/reference/kubectl/quick-reference/

### Build your free practice environment

Use kind for inexpensive local API, workload and YAML practice. It runs Kubernetes nodes as containers and needs a working supported container runtime plus kubectl and kind installed. Reserve roughly 4 CPUs and 8 GB RAM for a comfortable small lab; requirements vary. Use disposable Linux VMs for systemd, kubeadm, host networking, upgrades and recovery. kind is not a substitute for host administration.

1. Install Docker or another supported runtime, kind and kubectl from their official documentation. Confirm the runtime can start containers.
2. Save the configuration below as kind.yaml; run the create command separately after saving.
3. Wait for nodes, create the practice namespace and check you are using the kind-cka context. For advanced labs create one control-plane VM and two workers with SSH and sudo.

```
# kind.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
---
# Run in your shell, not as part of the YAML file:
# kind create cluster --name cka --config kind.yaml
# kubectl config use-context kind-cka
# kubectl wait --for=condition=Ready nodes --all --timeout=180s
# kubectl create namespace practice
```

**Verify:** kubectl get nodes should show three Ready nodes. A Pod in practice should start. NetworkPolicy labs need an enforcing CNI; kind’s default networking does not enforce those policies.

**Watch out:** Keep experiments isolated. kind delete cluster --name cka destroys that entire practice cluster. Do not run it against a cluster you need.

Documentation: https://kind.sigs.k8s.io/docs/user/quick-start/

### Contexts, namespaces & safe task execution

A context combines a cluster, identity and default namespace. Many exam errors come from correct commands against the wrong target. Begin every task by confirming the requested context and namespace; repeat this after SSH. Namespaces isolate names, not all security or networking. Nodes, PersistentVolumes and ClusterRoles are cluster scoped.

1. List contexts and switch to your disposable practice cluster.
2. Create practice if it does not exist. Set its namespace in the current context.
3. Use explicit -n for important commands; inspect a resource before modifying it.

```
kubectl config get-contexts
kubectl config current-context
kubectl config use-context kind-cka
kubectl create namespace practice --dry-run=client -o yaml | kubectl apply -f -
kubectl config set-context --current --namespace=practice
kubectl get pods -n practice
kubectl api-resources --namespaced=false
```

**Verify:** Identify the active cluster and user with kubectl config view --minify. Explain why a PV does not take -n practice.

**Watch out:** Use the exact context and SSH destination in each task. Do not assume your previous task’s namespace is still correct.

Documentation: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/

## Cluster Architecture, Installation & Configuration

### Understand the control plane & node components

The API server authenticates requests and exposes cluster state. etcd persists that state. The scheduler selects nodes for unscheduled Pods; controllers reconcile desired and observed state. On each node, kubelet runs assigned Pods through the container runtime’s CRI. A CNI provides Pod networking; a Service data plane (often kube-proxy or an alternative) handles Service traffic.

1. Draw the request flow from kubectl to API server to etcd, and from a new Pod through scheduling to kubelet.
2. Inspect system Pods and node details. On a kubeadm VM find static Pod manifests under /etc/kubernetes/manifests.
3. Stop using deprecated componentstatuses as a health signal; use readiness, component logs and node conditions.

```
kubectl get nodes -o wide
kubectl -n kube-system get pods -o wide
kubectl describe node
kubectl get --raw='/readyz?verbose'
# On a kubeadm control-plane VM:
sudo ls /etc/kubernetes/manifests
sudo systemctl status kubelet --no-pager
```

**Verify:** Explain what fails when the scheduler stops versus when etcd stops. Locate the kube-apiserver static Pod and its host manifest.

**Watch out:** Static Pods are supervised by kubelet. Deleting their mirror Pod through kubectl does not remove their source manifest.

Documentation: https://kubernetes.io/docs/concepts/architecture/

### Bootstrap a cluster with kubeadm

kubeadm bootstraps a control plane and joins nodes; it does not provision machines or choose a CNI. Use disposable Linux VMs with routable node addresses, unique hostnames, supported CRI runtimes, compatible kubelet/kubeadm/kubectl and required ports. Align runtime and kubelet cgroup drivers. Follow the version-specific installation guide rather than mixing repositories.

1. Prepare every VM: kernel modules, forwarding, runtime and swap behavior following the installation docs. Unless deliberately configuring supported swap, turn swap off and prevent its return after reboot.
2. Install matching Kubernetes packages from the pkgs.k8s.io repository for your target minor release. Record exact versions; hold packages where appropriate.
3. On the first control-plane VM run kubeadm init with the CNI’s required Pod CIDR and reachable API address. Copy the admin kubeconfig only to the intended administrator.
4. Install one compatible CNI from its official instructions. Run the generated join command on workers.

```
# Illustrative control-plane bootstrap; replace the address and CIDR.
sudo kubeadm init --apiserver-advertise-address=CONTROL_PLANE_IP --pod-network-cidr=POD_CIDR
mkdir -p "$HOME/.kube"
sudo cp /etc/kubernetes/admin.conf "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
# Install your chosen CNI now using its version-matched official guide.
kubectl get nodes
# Generate a worker join command if the original was lost:
sudo kubeadm token create --print-join-command
```

**Verify:** All nodes become Ready, CoreDNS becomes Ready, and Pods on different nodes communicate. Confirm you can resolve kubernetes.default from a test Pod.

**Watch out:** CONTROL_PLANE_IP and POD_CIDR are placeholders. Do not run this as pasted. Joining requires the generated token and discovery CA hash; do not bypass CA verification.

Documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/

### Plan a highly available control plane

High availability requires a stable API endpoint, multiple control-plane nodes, and etcd quorum. Stacked etcd shares control-plane machines; external etcd uses separate hosts. A three-member etcd cluster tolerates one failed member. A load balancer must route to healthy API servers and must not become your single point of failure.

1. Sketch three control-plane VMs, a stable load-balanced endpoint and worker nodes. Distinguish the API endpoint from an individual node IP.
2. Read kubeadm’s HA prerequisites and certificate transfer options. Join additional control-plane nodes with --control-plane using freshly generated join information.
3. In a disposable HA lab, stop one control-plane VM and verify the stable endpoint still accepts requests.

```
# Initial bootstrap shape; placeholders must be configured first:
sudo kubeadm init --control-plane-endpoint "API_DNS:6443" --upload-certs
# Inspect current API endpoint and system workload placement:
kubectl config view --minify
kubectl -n kube-system get pods -o wide
# Check certificate expiration on a control-plane VM:
sudo kubeadm certs check-expiration
```

**Verify:** Explain the quorum requirement and show API availability with one member unavailable. Restore that member before another failure test.

**Watch out:** Never publish certificate keys or join tokens. Two etcd members do not tolerate the loss of one member.

Documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/

### Grant least-privilege access with RBAC

RBAC binds permissions to subjects. A Role grants verbs on resources within a namespace; a ClusterRole defines reusable or cluster-scoped permissions. RoleBinding scopes a grant to a namespace; ClusterRoleBinding grants cluster-wide access. ServiceAccounts identify workloads. Authentication answers who; authorization answers what they may do.

1. Create a ServiceAccount named reader in practice.
2. Grant only get, list and watch on Pods in that namespace.
3. Check both an allowed operation and a forbidden operation by impersonating the ServiceAccount.

```
kubectl -n practice create serviceaccount reader
kubectl -n practice create role pod-reader --verb=get,list,watch --resource=pods
kubectl -n practice create rolebinding reader-pods --role=pod-reader --serviceaccount=practice:reader
kubectl auth can-i list pods -n practice --as=system:serviceaccount:practice:reader
kubectl auth can-i delete pods -n practice --as=system:serviceaccount:practice:reader
```

**Verify:** The list check returns yes and delete returns no. A check for list pods in default also returns no, assuming no other grants exist.

**Watch out:** Impersonation itself requires permission. Namespaced RBAC does not grant access to cluster-scoped Nodes. Avoid using cluster-admin to solve a narrow access task.

Documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

### Upgrade a kubeadm cluster safely

Upgrade one supported minor version at a time, starting with the first control-plane node, then other control planes and workers. Read the version-skew policy and target release guide. Back up etcd and configuration first. Drain evicts eligible workloads; PodDisruptionBudgets, unmanaged Pods and local data can prevent safe eviction.

1. On disposable VMs record current versions, take a verified backup and inspect the target version’s upgrade notes. Update the minor-specific package repository when necessary.
2. Install the exact target kubeadm package on the first control plane. Run kubeadm upgrade plan, then kubeadm upgrade apply with the selected version.
3. Drain the node, upgrade kubelet/kubectl as appropriate, reload systemd, restart kubelet and uncordon. Repeat node-by-node; use kubeadm upgrade node on subsequent control planes and workers.
4. Validate node versions, system Pods and application connectivity after each node.

```
# FIRST CONTROL PLANE: install target kubeadm using your OS package manager first.
sudo kubeadm upgrade plan
sudo kubeadm upgrade apply vTARGET_VERSION
# From an administrator shell:
kubectl drain NODE_NAME --ignore-daemonsets
# On that node, after installing the target kubelet and kubectl packages:
sudo systemctl daemon-reload
sudo systemctl restart kubelet
# From administrator shell:
kubectl uncordon NODE_NAME
kubectl get nodes -o wide
# OTHER NODES: after updating kubeadm, use sudo kubeadm upgrade node
```

**Verify:** Each upgraded node is Ready with the intended version. Workloads recover and all nodes are uncordoned. Record before/after versions.

**Watch out:** This is a procedure template, not a one-shot script. Replace placeholders and follow the target release docs. Do not add --force or --delete-emptydir-data without understanding the specific workload impact.

Documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/

### Install & manage components with Helm

A chart packages Kubernetes templates and defaults. A release is an installed instance with revision history; values customize it. Inspect rendered manifests before installing. Helm talks to the selected kubeconfig context, so the same targeting discipline applies. Use the installed tool’s help and docs: older videos may describe obsolete Helm behavior.

1. Use helm create to make a local practice chart; no paid chart repository is required. Inspect Chart.yaml, values.yaml and templates.
2. Render and lint it, then install into practice. Inspect the resources it creates.
3. Change replicaCount, upgrade, inspect history and roll back to revision 1.

```
helm create cka-demo
helm lint ./cka-demo
helm template demo ./cka-demo --namespace practice
helm install demo ./cka-demo -n practice --set replicaCount=1
helm list -n practice
helm upgrade demo ./cka-demo -n practice --set replicaCount=2
helm history demo -n practice
helm rollback demo 1 -n practice
helm status demo -n practice
# Cleanup only this release:
# helm uninstall demo -n practice
```

**Verify:** Observe two replicas after upgrade and one after rollback. Confirm the release namespace and revision with helm history.

**Watch out:** Chart value keys are chart-specific. Use helm show values for unfamiliar charts. Helm lint alone does not prove a chart will run successfully.

Documentation: https://helm.sh/docs/intro/quickstart/

### Compose environments with Kustomize

Kustomize transforms plain Kubernetes manifests using a kustomization.yaml. A base contains shared resources; an overlay changes a base for an environment. kubectl includes Kustomize through -k. Render first to catch selector, namespace and naming changes before applying.

1. Create a base directory and generate a Deployment named web into base/deployment.yaml.
2. Create the two kustomization.yaml files below in their indicated directories.
3. Render the development overlay; confirm three replicas and the practice namespace before applying.

```
mkdir -p base overlays/dev
kubectl create deployment web --image=nginx:stable --dry-run=client -o yaml > base/deployment.yaml
cat > base/kustomization.yaml <<'YAML'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
YAML
cat > overlays/dev/kustomization.yaml <<'YAML'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: practice
resources:
- ../../base
replicas:
- name: web
  count: 3
YAML
kubectl kustomize overlays/dev
kubectl apply -k overlays/dev
kubectl -n practice rollout status deployment/web
```

**Verify:** The rendered Deployment has namespace practice and replicas 3. kubectl -n practice get deployment web reports 3 available replicas.

**Watch out:** Use -k with a directory, not -f with kustomization.yaml. Never assume an overlay automatically creates its namespace.

Documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

### CRDs, custom resources & operators

A CustomResourceDefinition adds an API type; a custom resource is an instance of it. An operator is a controller that watches resources and implements reconciliation. Registering a CRD does not install a controller or perform application operations. Operators commonly have CRDs, RBAC, a Deployment and custom resources.

1. Inspect installed CRDs in a cluster with an operator. If none exist, install an operator only in a disposable cluster using its official manifests or chart.
2. Use api-resources and explain to discover its group, version, kind, scope and schema. Create a small instance following that operator’s documentation.
3. Inspect status.conditions, operator logs, RBAC and events; change a supported spec field and observe reconciliation.

```
kubectl get crds
kubectl api-resources
# Replace these names with a CRD installed in your lab:
kubectl describe crd CRD_NAME
kubectl explain RESOURCE_NAME.spec
kubectl get RESOURCE_NAME -A
kubectl -n OPERATOR_NAMESPACE logs deployment/OPERATOR_DEPLOYMENT --tail=100
```

**Verify:** Identify which controller acts on the custom resource and show a successful Ready or equivalent status condition defined by that operator.

**Watch out:** All uppercase identifiers here are placeholders. Deleting a CRD can delete every instance of its type. Finalizers may deliberately delay removal while a controller cleans up.

Documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/operator/

### Understand CNI, CSI & CRI interfaces

CRI connects kubelet to runtimes such as containerd or CRI-O. CNI configures Pod networking through plugins. CSI lets storage drivers provision, attach and mount volumes. They solve different problems: a runtime failure, a sandbox network failure and a volume mount failure need different evidence.

1. Describe a node to identify its runtime. Locate runtime and CNI configuration on a disposable VM.
2. Inspect CNI DaemonSets and installed CSI drivers.
3. Relate FailedCreatePodSandBox to runtime/network checks and FailedMount to volume/driver checks.

```
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'
kubectl -n kube-system get daemonsets
kubectl get csidrivers
# On a lab VM:
sudo crictl info
sudo ls /etc/cni/net.d
sudo ls /opt/cni/bin
```

**Verify:** Name the actual runtime, network plugin and storage provisioner in your lab. Explain why installing a CSI driver cannot repair a broken Pod network.

**Watch out:** Docker CLI is not the generic Kubernetes runtime debugging interface. crictl needs the correct runtime endpoint and sufficient permissions.

Documentation: https://kubernetes.io/docs/concepts/architecture/cri/

## Workloads & Scheduling

### Deploy, scale, update & roll back

A Deployment manages ReplicaSets, which maintain Pods. Change the Pod template to trigger a rollout. RollingUpdate balances extra capacity (maxSurge) and unavailable Pods (maxUnavailable); availability also depends on readiness, replicas, capacity and traffic routing. Recreate removes old Pods before creating replacements.

1. Create a three-replica web Deployment in practice and wait for availability.
2. Update its image, inspect rollout status and revision history.
3. Roll back, then inspect ReplicaSets to explain which revision is active.

```
kubectl -n practice create deployment web --image=nginx:stable --replicas=3
kubectl -n practice rollout status deployment/web
kubectl -n practice set image deployment/web nginx=nginx:alpine
kubectl -n practice rollout status deployment/web --timeout=120s
kubectl -n practice rollout history deployment/web
kubectl -n practice rollout undo deployment/web
kubectl -n practice get deployment,replicaset,pods -l app=web
```

**Verify:** Three Pods are Ready and the final Pod template uses the original image. Explain why changing a ConfigMap alone does not create a Deployment revision.

**Watch out:** The container name nginx comes from the generated Deployment; check it before set image. Reuse or delete existing web resources from earlier labs intentionally.

Documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

### ConfigMaps, Secrets & workload configuration

ConfigMaps hold non-confidential settings; Secrets hold sensitive data but base64 is encoding, not encryption. A workload can consume them as environment variables or files. Environment variables are read at startup. Projected file updates have different timing; subPath mounts do not receive automated updates. Keep secrets out of source control.

1. Create a ConfigMap and a demonstration Secret using fake data.
2. Create a Pod from the YAML example and read its environment variable.
3. Change the ConfigMap value and recreate the Pod; explain why the existing environment did not update.

```
kubectl -n practice create configmap app-config --from-literal=MODE=study
kubectl -n practice create secret generic demo-secret --from-literal=token=fake-training-value
cat > config-pod.yaml <<'YAML'
apiVersion: v1
kind: Pod
metadata:
  name: config-demo
  namespace: practice
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "sleep 3600"]
    envFrom:
    - configMapRef:
        name: app-config
YAML
kubectl apply -f config-pod.yaml
kubectl -n practice wait --for=condition=Ready pod/config-demo --timeout=90s
kubectl -n practice exec config-demo -- printenv MODE
```

**Verify:** The command prints study. Inspect the manifest and describe output without dumping any real Secret values.

**Watch out:** ConfigMap and Secret references must exist in the Pod’s namespace. A missing required reference can produce CreateContainerConfigError.

Documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

### Requests, limits, quotas & autoscaling

The scheduler uses requests to place Pods. CPU limits can throttle a container; memory limits can result in OOM termination. A ResourceQuota caps aggregate namespace consumption and LimitRange can supply defaults. HPA adjusts replicas based on metrics, and CPU utilization targets require CPU requests plus a working metrics pipeline.

1. Add CPU and memory requests and limits to the web Deployment.
2. Inspect scheduling and resource allocation. Check metrics availability.
3. Create an HPA and inspect its conditions; diagnose missing metrics before assuming autoscaling is broken.

```
kubectl -n practice set resources deployment web --requests=cpu=100m,memory=64Mi --limits=cpu=500m,memory=128Mi
kubectl -n practice rollout status deployment/web
kubectl top nodes
kubectl top pods -n practice
kubectl -n practice autoscale deployment web --cpu-percent=60 --min=2 --max=5
kubectl -n practice get hpa
kubectl -n practice describe hpa web
kubectl -n practice get resourcequota,limitrange
```

**Verify:** Explain 100m as one tenth of a CPU. HPA shows valid metrics when metrics-server is installed and healthy; otherwise record the actual missing dependency.

**Watch out:** kind does not guarantee metrics-server is installed. A quota admission failure differs from a scheduler Pending event. Raising limits does not create physical node capacity.

Documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

### Node selectors, affinity, taints & tolerations

nodeSelector requires matching node labels. Node affinity expresses required or preferred placement; inter-Pod affinity considers other Pods. Taints repel Pods unless they tolerate the taint. A toleration permits placement but does not force it. NoSchedule affects new placements; NoExecute can evict existing Pods.

1. Choose a worker with kubectl get nodes, then label it disk=ssd.
2. Create a Pod with nodeSelector disk=ssd. Check its assigned node.
3. Taint a disposable worker dedicated=study:NoSchedule. Add a matching toleration and required selector to a second Pod; inspect scheduling events before and after.

```
# Replace WORKER_NAME with one of your disposable workers.
kubectl label node WORKER_NAME disk=ssd --overwrite
kubectl taint node WORKER_NAME dedicated=study:NoSchedule
# Relevant Pod spec fragments:
# nodeSelector:
#   disk: ssd
# tolerations:
# - key: dedicated
#   operator: Equal
#   value: study
#   effect: NoSchedule
kubectl -n practice get pods -o wide
kubectl -n practice get events --sort-by=.metadata.creationTimestamp
# Restore this worker after the lab:
# kubectl taint node WORKER_NAME dedicated=study:NoSchedule-
```

**Verify:** The constrained Pod schedules to the labeled worker only when the taint is tolerated. Explain why a toleration alone can still place it on another eligible node.

**Watch out:** Do not taint all nodes before understanding recovery. A typo in a required label leaves a Pod Pending. Fragment comments are not a complete Pod manifest.

Documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

### Readiness, liveness & startup probes

Readiness determines whether a Pod should receive Service traffic. Liveness failure can restart a container. Startup probes delay readiness and liveness checks until startup succeeds. Choose endpoints and thresholds that measure the intended behavior; restarting a healthy app because a dependency is unavailable can amplify an outage.

1. Export the web Deployment and add the probe fields below inside the nginx container.
2. Apply and inspect readiness, restart counts and events.
3. In the disposable copy set readiness path to a missing URL, observe unready endpoints, then repair the path.

```
# Container-level fields for an nginx Deployment:
readinessProbe:
  httpGet:
    path: /
    port: 80
  periodSeconds: 5
livenessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 10
  periodSeconds: 10
startupProbe:
  httpGet:
    path: /
    port: 80
  failureThreshold: 30
  periodSeconds: 2
```

**Verify:** After correction all replicas are Ready. The bad readiness path removes traffic eligibility without necessarily restarting containers.

**Watch out:** This YAML is a container fragment. Insert it beneath spec.template.spec.containers[]; do not apply it as a standalone object.

Documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

### DaemonSets, StatefulSets, Jobs & static Pods

Use a DaemonSet for a node-local agent on eligible nodes. StatefulSets provide stable Pod identities and ordered behavior, often with per-Pod PVCs. Jobs run to completion; CronJobs schedule Jobs. Static Pods are managed directly by kubelet from host files. Choose the controller based on lifecycle, identity and placement requirements.

1. Create a Job and confirm completion, then inspect logs.
2. Generate a CronJob manifest and inspect schedule, restart policy and concurrency settings.
3. Read one existing system DaemonSet. On a disposable kubeadm host, locate staticPodPath in the kubelet configuration.

```
kubectl -n practice create job hello --image=busybox:1.36 -- sh -c 'echo hello-cka'
kubectl -n practice wait --for=condition=complete job/hello --timeout=90s
kubectl -n practice logs job/hello
kubectl -n practice create cronjob clock --image=busybox:1.36 --schedule='*/5 * * * *' --dry-run=client -o yaml -- sh -c date
kubectl -n kube-system get daemonsets
# On a kubeadm VM:
sudo cat /var/lib/kubelet/config.yaml
```

**Verify:** The Job completes successfully and outputs hello-cka. Explain why a Deployment is a poor fit for a one-time migration.

**Watch out:** Generating YAML does not create the CronJob. StatefulSet deletion does not imply all persistent data is removed. Never leave backup manifests in the watched static Pod directory.

Documentation: https://kubernetes.io/docs/concepts/workloads/controllers/

## Services & Networking

### Services, selectors & EndpointSlices

A ClusterIP Service provides a stable virtual address for selected backends. NodePort adds a port on nodes; LoadBalancer integrates with an implementation that provisions external access. Headless Services expose backend addresses directly. A Service port can differ from targetPort; its selector must match Pod labels and readiness affects usable endpoints.

1. Expose the web Deployment from the workloads lab as ClusterIP on port 80.
2. Inspect the Service selector, Pod labels and EndpointSlices.
3. Start an ephemeral client Pod and request web.practice.svc.cluster.local.

```
kubectl -n practice expose deployment web --port=80 --target-port=80
kubectl -n practice get service web -o yaml
kubectl -n practice get pods --show-labels
kubectl -n practice get endpointslices -l kubernetes.io/service-name=web
kubectl -n practice run client --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- http://web.practice.svc.cluster.local
```

**Verify:** An HTTP response comes back from nginx. EndpointSlices contain the Ready Pod IPs and the target port is 80.

**Watch out:** EXTERNAL-IP Pending is expected without a LoadBalancer implementation. Port-forward tests API-mediated access, not the complete in-cluster Service networking path.

Documentation: https://kubernetes.io/docs/concepts/services-networking/service/

### Cluster DNS & Pod networking

Pods get their own IP addresses and can communicate through the cluster’s network implementation. CoreDNS typically serves cluster DNS; Services receive names like service.namespace.svc.cluster.local. A short name uses the client Pod’s namespace search path. Separate DNS failure from connection failure by testing a name and an IP independently.

1. Use a test Pod to resolve kubernetes.default and web.practice.svc.cluster.local.
2. Inspect the Pod’s resolv.conf and CoreDNS Service and Deployment.
3. If names fail, inspect CoreDNS logs, endpoints, Pod DNS policy, NetworkPolicy and network reachability.

```
kubectl -n practice run dnscheck --rm -it --restart=Never --image=busybox:1.36 -- sh
# Inside the test Pod:
# cat /etc/resolv.conf
# nslookup kubernetes.default.svc.cluster.local
# nslookup web.practice.svc.cluster.local
# wget -qO- http://web.practice.svc.cluster.local
# exit
kubectl -n kube-system get deployment coredns
kubectl -n kube-system get service kube-dns
kubectl -n kube-system logs deployment/coredns --tail=50
```

**Verify:** Both names resolve. Explain why a Pod in another namespace needs web.practice rather than just web.

**Watch out:** The cluster domain and DNS labels can differ in custom clusters. Do not blindly replace a CoreDNS ConfigMap with one from a different environment.

Documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

### Isolate traffic with NetworkPolicy

NetworkPolicies select Pods and allow ingress or egress at network level, enforced by a compatible CNI. Without a selecting policy, traffic is generally not isolated in that direction. Selecting an empty ingress rule list denies inbound traffic to selected Pods; allow rules from all policies combine. Namespace and Pod selectors in the same peer are ANDed; separate peers are ORed.

1. Use a cluster with policy enforcement and the running web Service.
2. Apply the policy below to allow only Pods labeled access=true in practice to reach app=web on TCP 80.
3. Test from both labeled and unlabeled clients; compare actual connectivity. For egress isolation, allow DNS UDP and TCP 53 to the correct DNS endpoints as well as required app traffic.

```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-only-clients
  namespace: practice
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes: [Ingress]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access: "true"
    ports:
    - protocol: TCP
      port: 80
```

**Verify:** In a clean policy-enabled lab the labeled client succeeds and the unlabeled client times out. Inspect other policies if both succeed.

**Watch out:** The default kind CNI does not enforce NetworkPolicy. A successful kubectl apply proves the API accepted the object, not that packets are filtered.

Documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

### Route HTTP traffic with Ingress

Ingress describes HTTP(S) host and path routing to Services. An Ingress controller must implement it; creating an object alone does not expose traffic. ingressClassName selects a controller class. Exact, Prefix and ImplementationSpecific path types differ. TLS commonly references a same-namespace Secret with a certificate and private key.

1. Install a supported Ingress controller in your disposable lab using its official instructions. Discover its IngressClass.
2. Apply the manifest below after replacing CLASS_NAME with an installed class.
3. Send a request with Host: web.example.test to the controller’s reachable address, then test a nonmatching path.

```
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: practice
spec:
  ingressClassName: CLASS_NAME
  rules:
  - host: web.example.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

**Verify:** kubectl describe ingress web -n practice identifies the intended backend and curl -H "Host: web.example.test" http://CONTROLLER_ADDRESS returns nginx.

**Watch out:** Replace placeholders. A controller may not have a public address in a local lab. Ingress is still an objective even though Gateway API is the newer model.

Documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

### Gateway API: classes, listeners & HTTPRoutes

GatewayClass identifies a controller; Gateway configures listeners; HTTPRoute attaches routing rules to a Gateway. Gateway API requires its CRDs and a compatible controller. Check status conditions to distinguish an accepted route from a working data plane. Cross-namespace references may need ReferenceGrant and listener permissions.

1. Follow the official getting-started guide to install CRDs and an implementation in a disposable lab. Find an installed GatewayClass.
2. Create a Gateway with an HTTP listener and allowedRoutes for your namespace. Then apply the HTTPRoute below referencing that Gateway.
3. Inspect Accepted, ResolvedRefs and Programmed conditions where exposed, and test with the configured hostname against the Gateway address.

```
# Prerequisite: Gateway web-gateway in practice, HTTP listener on port 80.
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-route
  namespace: practice
spec:
  parentRefs:
  - name: web-gateway
  hostnames: ["web.example.test"]
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: web
      port: 80
# Inspect:
# kubectl get gatewayclass
# kubectl -n practice get gateway,httproute
# kubectl -n practice describe httproute web-route
```

**Verify:** The route is accepted, backend references resolve and an HTTP request reaches web through the Gateway. Explain why CRDs without a controller cannot route traffic.

**Watch out:** This route intentionally assumes an existing Gateway. Use your implementation’s GatewayClass and setup instructions; no universal controller name works everywhere.

Documentation: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/

## Storage

### PersistentVolumes, claims & access modes

A PersistentVolume describes provisioned storage; a PersistentVolumeClaim requests it; Pods mount claims. Matching involves class, capacity, access mode and volume mode. RWO means read-write from one node, not necessarily one Pod. RWOP requires supporting CSI storage. Reclaim policy controls what happens after a claim is released.

1. Inspect available StorageClasses. For this static lab create the sample PV and PVC in a disposable single-node cluster.
2. Create a Pod mounting data at /data and write a file. Delete and recreate that Pod with the same claim.
3. Read the file after recreation; inspect Bound status and the Retain reclaim policy.

```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: cka-static
spec:
  capacity:
    storage: 1Gi
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /tmp/cka-static-data
    type: DirectoryOrCreate
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
  namespace: practice
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: manual
  volumeName: cka-static
  resources:
    requests:
      storage: 1Gi
```

**Verify:** The claim is Bound and the same file survives Pod replacement on the same lab node. Use kubectl get pv,pvc -n practice to inspect binding.

**Watch out:** hostPath is for this single-node exercise only; it is neither portable shared storage nor a safe general production provisioner. In multi-node clusters use CSI or node-aware local volumes.

Documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

### Mount volumes & understand data lifetime

emptyDir exists for a Pod’s lifetime and survives container restarts, but disappears with the Pod. PVC-backed data follows the volume lifecycle. ConfigMap and Secret volumes project configuration as files. Mount paths live inside containers; persistent storage must be explicitly attached through volumes and volumeMounts.

1. After the PV/PVC lab, apply the Pod below. Write /data/note.txt.
2. Delete only the Pod and apply it again; read the file.
3. Compare that behavior with an emptyDir volume in another Pod.

```
apiVersion: v1
kind: Pod
metadata:
  name: writer
  namespace: practice
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "sleep 3600"]
    volumeMounts:
    - name: persistent
      mountPath: /data
  volumes:
  - name: persistent
    persistentVolumeClaim:
      claimName: data
# After applying and waiting for Ready:
# kubectl -n practice exec writer -- sh -c 'echo retained > /data/note.txt'
# kubectl -n practice exec writer -- cat /data/note.txt
```

**Verify:** The file remains after Pod recreation when the same backing storage is attached. Show that deleting an emptyDir Pod loses its file.

**Watch out:** Deleting the claim may trigger backend deletion under a Delete reclaim policy. Inspect reclaim behavior before cleaning up storage.

Documentation: https://kubernetes.io/docs/concepts/storage/volumes/

### StorageClasses, dynamic provisioning & expansion

A StorageClass defines a provisioner, parameters, reclaim policy and binding behavior. Dynamic provisioning creates backing storage for a claim. WaitForFirstConsumer delays binding until scheduling can honor topology constraints. Expansion requires allowVolumeExpansion and driver support; increasing a claim does not allow shrinking it later.

1. Inspect your lab’s StorageClass and CSI provisioner. Create a claim using an installed class and mount it in a consumer Pod.
2. Check whether binding waits for a consumer. Inspect events rather than treating all Pending claims as failures.
3. If the class and driver support it, increase the requested storage and observe claim, volume and filesystem conditions.

```
kubectl get storageclass
kubectl describe storageclass CLASS_NAME
kubectl -n practice get pvc
kubectl -n practice describe pvc CLAIM_NAME
# Only for an expandable class and supported driver:
kubectl -n practice patch pvc CLAIM_NAME --type=merge -p '{"spec":{"resources":{"requests":{"storage":"2Gi"}}}}'
kubectl -n practice get pvc CLAIM_NAME -w
```

**Verify:** Identify the provisioner, binding mode and reclaim policy. If expansion is supported, confirm capacity and filesystem growth rather than just the changed request.

**Watch out:** CLASS_NAME and CLAIM_NAME are placeholders. Not every local provisioner supports resizing or topology. Do not edit PV capacity manually to simulate successful expansion.

Documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

### Diagnose Pending claims & failed mounts

Follow storage from Pod event to PVC, PV, StorageClass, CSI controller and node plugin. A Pending claim can be normal with delayed binding or can indicate missing class, incompatible modes, capacity, selector or topology. A Bound claim does not prove the filesystem mounted successfully.

1. Create a claim requesting a nonexistent class in a disposable namespace and inspect its events.
2. Compare the failed claim with a correctly Bound claim.
3. Inspect a Pod’s FailedMount or FailedAttachVolume events and follow the named driver’s logs; repair the class or mount configuration.

```
kubectl -n practice get pods,pvc
kubectl -n practice describe pod writer
kubectl -n practice describe pvc data
kubectl get pv
kubectl get storageclass
kubectl get volumeattachments
kubectl -n kube-system get pods -o wide
kubectl -n practice get events --sort-by=.metadata.creationTimestamp
```

**Verify:** Explain the actual failing stage and confirm both Bound PVC and Ready consumer Pod after correction. Write and read a test file.

**Watch out:** Do not repeatedly delete claims to fix a mount problem. Data can be destroyed. First inspect events, attachment conflicts and node availability.

Documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Troubleshooting

### A repeatable troubleshooting workflow

Start by defining expected and observed behavior. Verify context, namespace and task scope, then work from broad symptoms to specific evidence. Inspect status, events, configuration and logs. Change one plausible cause at a time and verify the original user-visible path, not just a green status field.

1. Inventory nodes and workloads, then sort recent events.
2. Choose a failing object and inspect its detailed conditions. Use logs for the failing container, including --previous after a crash.
3. Write a short diagnosis: symptom, evidence, cause, minimal change, verification.

```
kubectl config current-context
kubectl get nodes
kubectl get pods -A -o wide
kubectl get events -A --sort-by=.metadata.creationTimestamp
kubectl -n practice describe pod POD_NAME
kubectl -n practice logs POD_NAME -c CONTAINER_NAME --tail=100
kubectl -n practice logs POD_NAME -c CONTAINER_NAME --previous --tail=100
```

**Verify:** For an original failure, show both the diagnostic evidence and a working end-to-end check after your fix.

**Watch out:** Logs do not explain scheduling failures because the container may never have started. Read events first for Pending or ContainerCreating.

Documentation: https://kubernetes.io/docs/tasks/debug/

### Fix Pending, image errors & CrashLoopBackOff

Pending often points to scheduling, PVCs or admission requirements. ImagePullBackOff indicates an image retrieval problem. CrashLoopBackOff is restart backoff after a container repeatedly exits; inspect exit codes, previous logs, probes, commands and configuration. OOMKilled points to memory termination but the reason still needs analysis.

1. Create a Deployment with nginx:this-tag-does-not-exist-cka and inspect events.
2. Correct the image to nginx:stable and wait for rollout.
3. Create a second Pod that exits with code 1. Inspect previous logs and restart count; replace the incorrect command with a long-running workload.

```
kubectl -n practice create deployment broken --image=nginx:this-tag-does-not-exist-cka
kubectl -n practice get pods -l app=broken
kubectl -n practice describe pods -l app=broken
kubectl -n practice set image deployment/broken nginx=nginx:stable
kubectl -n practice rollout status deployment/broken --timeout=120s
kubectl -n practice get pods -l app=broken -o wide
```

**Verify:** Identify the image error in events and show the repaired Deployment Available. For the crash exercise explain the exit code and command, not just the restart count.

**Watch out:** Restarting a Pod cannot fix a nonexistent image tag. Registry authentication, DNS, rate limits and node egress can also cause image pulls to fail.

Documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/

### Recover a NotReady node & inspect the runtime

A node’s conditions expose Ready, MemoryPressure, DiskPressure and PIDPressure. kubelet reports node status; a failed runtime, bad CNI, expired credentials or exhausted disk can disrupt it. If the API is unavailable, host-level systemd and CRI tools become essential. Preserve evidence before restarting services.

1. On a disposable worker VM stop kubelet and observe the node’s status after the control plane detects missed heartbeats.
2. SSH to that VM and inspect systemd, journal, disk, memory and runtime state.
3. Restart kubelet, wait for Ready, then verify existing workloads and scheduling.

```
kubectl describe node WORKER_NAME
# Run on the affected lab node:
sudo systemctl status kubelet --no-pager
sudo journalctl -u kubelet -n 100 --no-pager
sudo systemctl status containerd --no-pager
sudo crictl ps -a
df -h
free -m
sudo systemctl restart kubelet
# Back in your administrator shell:
kubectl wait --for=condition=Ready node/WORKER_NAME --timeout=180s
```

**Verify:** The node returns to Ready and its intended workloads are healthy. Record which host log proved the failure.

**Watch out:** The runtime service name depends on the cluster. Stopping kubelet does not immediately stop running containers. Never use this failure injection on a shared or production node.

Documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/

### Repair control-plane static Pods & certificates

On kubeadm clusters, kubelet reads static Pod manifests for API server, scheduler, controller manager and often etcd. A malformed flag, missing file or bad certificate path can stop a component. Without API access, inspect CRI logs and host files. Back up manifests outside the watched directory before editing.

1. In a disposable VM lab copy the chosen manifest to a directory outside /etc/kubernetes/manifests.
2. Introduce one reversible typo in a component flag, observe the failure and use crictl logs on the exited container.
3. Correct the flag and wait for kubelet reconciliation. Inspect certificate expiry and node time when TLS errors appear.

```
sudo mkdir -p /root/cka-backups
sudo cp /etc/kubernetes/manifests/kube-apiserver.yaml /root/cka-backups/kube-apiserver.yaml
sudo crictl ps -a --name kube-apiserver
# Use a real container ID from the preceding output:
sudo crictl logs CONTAINER_ID
sudo journalctl -u kubelet -n 100 --no-pager
sudo kubeadm certs check-expiration
timedatectl
# After repairing the host manifest:
kubectl get --raw='/readyz?verbose'
```

**Verify:** API readiness succeeds and system Pods recover. Explain the exact flag or certificate error found in the component log.

**Watch out:** Do not blindly renew all certificates or restore unrelated manifests. Keep backup YAML outside the static manifest directory to avoid duplicate component Pods.

Documentation: https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/

### Back up & restore etcd

etcd snapshots preserve Kubernetes API state. Use etcdctl for the live snapshot and etcdutl for offline validation and restore. A restore creates a new data directory; it is not simply copying a database into a running member. Match tool versions, inspect actual endpoints and TLS paths, and practice recovery on disposable kubeadm VMs only.

1. Inspect the etcd static manifest for actual endpoint, certificate, key, member name and data paths. Verify etcdctl and etcdutl versions.
2. Save a snapshot with valid TLS credentials and check its status. Create a marker object after the snapshot so recovery has a visible effect.
3. For a single-member disposable recovery, stop kube-apiserver and etcd by moving their manifests outside the watched directory; wait until their containers stop. Restore into a new directory using the member configuration in the recovery docs.
4. Update the etcd manifest’s hostPath for its data volume to the restored directory, preserving the intended container mount path. Restore the etcd manifest first and then API server manifest. Wait for health and inspect the marker. Multi-member recovery requires coordinated membership configuration.

```
# Common kubeadm paths ONLY; verify against the actual manifest first.
sudo etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /root/cka-snapshot.db
sudo etcdutl snapshot status /root/cka-snapshot.db -w table
# Offline single-member restore shape: supply actual member parameters.
# Modern etcd recovery guidance recommends a revision bump for Kubernetes.
sudo etcdutl snapshot restore /root/cka-snapshot.db \
  --data-dir=/var/lib/etcd-restored \
  --bump-revision=1000000000 --mark-compacted
# Complete manifest/data-directory reconnection per the steps above.
```

**Verify:** After recovery the API becomes Ready, pre-snapshot objects exist, post-snapshot marker changes are absent, nodes recover and workloads reconcile. The snapshot status command alone does not prove recovery.

**Watch out:** The restore command is not the entire recovery procedure. Read the installed version’s help and recovery docs; member URLs, names and permissions may require explicit options. Never restore a production cluster as a practice exercise.

Documentation: https://etcd.io/docs/v3.6/op-guide/recovery/

### Trace a broken Service end to end

Trace client → DNS → Service → EndpointSlice → Pod IP → listening container. A Service with no endpoints often has a selector mismatch or no Ready Pods. A connection refused at Pod IP usually needs application-port investigation. A timeout suggests routing, policy or a nonresponsive application, but always collect evidence.

1. With a healthy web Deployment and Service, patch the Service selector to app=wrong.
2. Confirm the Service still exists but EndpointSlices no longer offer the expected backends.
3. Repair the selector and test HTTP from a new client. Then practice diagnosing targetPort and readiness mismatches separately.

```
kubectl -n practice patch service web -p '{"spec":{"selector":{"app":"wrong"}}}'
kubectl -n practice get service web -o yaml
kubectl -n practice get endpointslices -l kubernetes.io/service-name=web
kubectl -n practice get pods --show-labels
kubectl -n practice patch service web -p '{"spec":{"selector":{"app":"web"}}}'
kubectl -n practice run probe --rm -it --restart=Never --image=busybox:1.36 -- wget -T 5 -qO- http://web
```

**Verify:** HTTP works again from inside the cluster. Explain why restarting CoreDNS would not repair a mismatched Service selector.

**Watch out:** Other NetworkPolicies from earlier labs may affect the probe. Inspect them or use a fresh practice namespace before interpreting results.

Documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/

### Monitor resources, logs & cluster health

kubectl top reads resource metrics, not application logs or historical monitoring. describe exposes object events and state; logs reads container output. Multi-container Pods require selecting a container. System components may be static Pods, DaemonSets or host services, so choose the appropriate logging path.

1. Inspect CPU and memory with top when metrics-server is available. Compare requests, limits and usage.
2. Read a workload’s recent timestamped logs and previous instance logs.
3. Sort events and correlate them with rollout and node condition changes.

```
kubectl top nodes
kubectl top pods -A --sort-by=memory
kubectl -n practice logs deployment/web --all-containers=true --tail=50 --timestamps
kubectl -n practice describe deployment web
kubectl get events -A --sort-by=.metadata.creationTimestamp
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{range .status.conditions[?(@.type=="Ready")]}{.status}{end}{"\n"}{end}'
```

**Verify:** Find the highest-memory Pod when metrics are available and correlate one actual event with its workload condition.

**Watch out:** No metrics is not proof of zero usage. top is a point-in-time signal; it cannot show yesterday’s OOM event or explain application correctness.

Documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/

## Command reference

### Context and namespace

Always confirm the requested target before making a change.

```
kubectl config get-contexts
kubectl config use-context CONTEXT_NAME
kubectl config set-context --current --namespace=NAMESPACE
kubectl config view --minify
```

### Inspect resources and fields

Use explain instead of guessing schema fields.

```
kubectl api-resources
kubectl explain deployment.spec.strategy
kubectl explain pod.spec.containers --recursive
kubectl get pods -A -o wide
kubectl get nodes --show-labels
```

### Generate YAML quickly

Inspect and edit generated files before applying.

```
kubectl run demo --image=nginx:stable --dry-run=client -o yaml > pod.yaml
kubectl create deployment demo --image=nginx:stable --replicas=3 --dry-run=client -o yaml > deploy.yaml
kubectl apply --dry-run=server -f deploy.yaml
kubectl diff -f deploy.yaml
kubectl apply -f deploy.yaml
```

### Scale and roll out

Use the real container name when updating images.

```
kubectl -n practice scale deployment web --replicas=3
kubectl -n practice set image deployment/web nginx=nginx:alpine
kubectl -n practice rollout status deployment/web
kubectl -n practice rollout history deployment/web
kubectl -n practice rollout undo deployment/web
```

### Events and logs

Replace POD and CONTAINER. --previous reads a previous terminated container instance.

```
kubectl -n practice describe pod POD
kubectl -n practice logs POD -c CONTAINER --tail=100 --timestamps
kubectl -n practice logs POD -c CONTAINER --previous
kubectl get events -A --sort-by=.metadata.creationTimestamp
```

### Node and runtime

Run host commands on the affected node. Runtime service and endpoint vary.

```
sudo systemctl status kubelet --no-pager
sudo journalctl -u kubelet -n 100 --no-pager
sudo crictl info
sudo crictl ps -a
sudo crictl logs CONTAINER_ID
df -h
free -m
```

### Trace Service endpoints

Check labels, readiness, targetPort and policy.

```
kubectl -n practice get service web -o yaml
kubectl -n practice get pods --show-labels
kubectl -n practice get endpointslices -l kubernetes.io/service-name=web
kubectl -n practice run nettest --rm -it --restart=Never --image=busybox:1.36 -- sh
```

### Inspect routing and policy

Gateway resources exist only after their CRDs are installed.

```
kubectl get ingressclass
kubectl -n practice describe ingress web
kubectl get gatewayclass
kubectl -n practice describe gateway web-gateway
kubectl -n practice describe httproute web-route
kubectl -n practice get networkpolicy
```

### RBAC checks

Test both the permitted and forbidden operation.

```
kubectl auth can-i list pods -n practice --as=system:serviceaccount:practice:reader
kubectl auth can-i delete pods -n practice --as=system:serviceaccount:practice:reader
kubectl -n practice get role,rolebinding
kubectl get clusterrole,clusterrolebinding
```

### Claims and provisioning

A Bound claim is only one stage of a working volume mount.

```
kubectl get storageclass
kubectl get pv
kubectl -n practice get pvc
kubectl -n practice describe pvc data
kubectl -n practice describe pod writer
kubectl get volumeattachments
```

### Drain and resume scheduling

Replace NODE; inspect PDBs and local data before evicting anything.

```
kubectl get pdb -A
kubectl cordon NODE
kubectl drain NODE --ignore-daemonsets
kubectl uncordon NODE
kubectl get nodes -o wide
```

### Chart and release lifecycle

Substitute a chart path or a configured repo/chart.

```
helm list -A
helm show values CHART
helm template RELEASE CHART -n practice -f values.yaml
helm upgrade --install RELEASE CHART -n practice -f values.yaml
helm history RELEASE -n practice
helm rollback RELEASE REVISION -n practice
```

### Render and apply overlays

Review rendered output first.

```
kubectl kustomize overlays/dev
kubectl diff -k overlays/dev
kubectl apply -k overlays/dev
```

### JSONPath and sorting

Useful for extracting the exact value a task requests.

```
kubectl get pods -A --sort-by=.spec.nodeName
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
kubectl -n practice get pods -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,PHASE:.status.phase
```

### Resource metrics

Requires a functioning metrics API.

```
kubectl top nodes
kubectl top pods -A --sort-by=cpu
kubectl -n practice describe hpa
kubectl get --raw='/readyz?verbose'
```

## Original mock exams

120 minutes each. See website for timer, prerequisites and self-assessment.

### Mock A

**RBAC (10)**: In namespace mock-a create ServiceAccount observer. Grant get/list/watch on Pods in mock-a only. Do not allow deletion.

Approach/verification: Use a namespaced Role and RoleBinding. Check list=yes and delete=no using --as=system:serviceaccount:mock-a:observer.

**Helm (8)**: Create a local chart with helm create. Install release study in mock-a, upgrade to two replicas, then roll back to the first revision.

Approach/verification: Render first. Verify helm history and the final Deployment replica count.

**Kustomize (7)**: Create a base Deployment and a development overlay setting namespace mock-a and replicas=3. Render and apply it.

Approach/verification: Verify the rendered object and three Ready replicas. Use -k with the directory.

**Deployment (10)**: Create Deployment api with nginx:stable and three replicas. Configure CPU request 100m and memory limit 128Mi. Update the image to nginx:alpine, then undo the rollout.

Approach/verification: Use rollout status after each change. Check the current template image, limits and Ready replica count.

**Placement (5)**: Label a disposable worker exam=target. Schedule a new Pod onto that worker with a required selector.

Approach/verification: Use nodeSelector or required node affinity. Verify spec.nodeName matches the labeled worker.

**Service (8)**: Expose api as ClusterIP on port 8080 targeting port 80. Verify an HTTP request from a client Pod.

Approach/verification: Inspect EndpointSlices and use http://api.mock-a.svc.cluster.local:8080.

**NetworkPolicy (6)**: With an enforcing CNI, allow TCP 80 ingress to app=api only from Pods labeled allowed=true in mock-a.

Approach/verification: Use isolated fresh namespace and test positive and negative clients. Applying a policy without traffic tests earns no credit.

**Gateway API (6)**: Using an installed GatewayClass/controller, create an HTTP Gateway and HTTPRoute for api.example.test to the api Service on port 8080.

Approach/verification: Inspect listener and parent status; test Host header against the reachable Gateway.

**Persistent data (10)**: Create a 1Gi PVC using a working class and mount it at /data. Write a file; recreate the consumer Pod and read it.

Approach/verification: Verify Bound, Ready and file contents. Use supported CSI or the single-node static lab.

**Image failure (10)**: Create a broken Deployment using nginx:this-tag-does-not-exist-cka. Diagnose and repair it without deleting the Deployment.

Approach/verification: Read events, correct the template image and confirm rollout availability.

**Service failure (10)**: Break the api Service selector deliberately. Find the cause using EndpointSlices and labels, repair it and prove HTTP works.

Approach/verification: Evidence should include the selector mismatch, restored endpoints and successful request.

**Node failure (10)**: On a disposable worker VM stop kubelet. Diagnose from host logs and recover the node.

Approach/verification: Use systemctl/journalctl and verify node Ready plus healthy workload connectivity.

### Mock B

**Bootstrap & HA plan (10)**: On clean disposable VMs, bootstrap one kubeadm control plane and join one worker. Explain the changes needed for three control planes with an API load balancer.

Approach/verification: Follow current install docs, CNI requirements and version compatibility. Verify Ready nodes, DNS and cross-node traffic.

**Upgrade (8)**: Upgrade a disposable kubeadm cluster to the next supported minor release following the target version guide.

Approach/verification: Take a backup, update kubeadm first, plan/apply on first control plane, upgrade node on others, update kubelet, drain/uncordon and verify.

**Operator (7)**: Using a documented operator, install its CRDs and controller; create a small custom resource and inspect reconciliation.

Approach/verification: Show CRD registration, operator Deployment health, custom resource status and logs. Do not claim success from CRD installation alone.

**Probes & config (10)**: Deploy nginx with an HTTP readiness probe and a ConfigMap environment variable. Break only readiness and explain the traffic effect, then repair it.

Approach/verification: Check Ready condition and EndpointSlices; show that readiness failure alone is not a liveness restart.

**Taints & tolerations (5)**: Taint one disposable worker dedicated=study:NoSchedule. Create a Pod constrained to that worker with a matching toleration. Remove the taint after verification.

Approach/verification: Show matching selector/affinity plus toleration and verify assigned node.

**DNS diagnosis (6)**: From a Pod resolve a same-namespace Service and a cross-namespace Service. Diagnose a deliberately misspelled service hostname.

Approach/verification: Inspect search paths, compare correct FQDN with IP connectivity, and avoid editing CoreDNS for a nonexistent name.

**Ingress (7)**: Using an installed Ingress controller, expose a Service at app.example.test with Prefix path /.

Approach/verification: Use the installed ingressClassName, check backend port and verify a Host-header request.

**Gateway repair (7)**: Create an HTTPRoute with a nonexistent backend. Diagnose the unresolved reference, fix it and verify HTTP traffic through a Gateway.

Approach/verification: Inspect parent conditions and backendRefs; success includes traffic through a programmed Gateway.

**Storage repair (10)**: Create a PVC referencing a nonexistent class. Diagnose the failure and create a corrected claim with a working class and consumer.

Approach/verification: Inspect PVC events and available classes. Verify Bound, Ready and actual write/read. Cleanup must respect reclaim policy.

**Snapshot recovery (12)**: On a disposable single-member kubeadm lab take a snapshot, add a marker, restore into a new data directory, reconnect etcd and recover the API.

Approach/verification: Validate snapshot, follow member/version-specific restore guidance, relocate manifests outside watch directory, update hostPath and show marker absent after restore.

**Control plane recovery (10)**: In a disposable kubeadm VM introduce a reversible bad kube-apiserver flag. Diagnose with CRI logs and repair the manifest.

Approach/verification: Back up outside manifest directory. Verify API readiness, system Pods and workload reconciliation.

**Resource diagnosis (8)**: Inspect node and Pod metrics where available. Diagnose one Pending Pod with an impossible CPU request; fix its request without adding nodes.

Approach/verification: Use FailedScheduling evidence and node allocatable values, then demonstrate a Ready Pod.

## Sources

- [CNCF CKA overview](https://www.cncf.io/training/certification/cka/) — Official domain weights and performance-based exam format.
- [CNCF curriculum](https://github.com/cncf/curriculum/tree/master/cka) — Canonical curriculum repository. Compare objectives again before booking.
- [Linux Foundation FAQ](https://docs.linuxfoundation.org/tc-docs/certification/faq-cka-ckad-cks) — Live exam version, duration, passing score and registration details.
- [Allowed exam resources](https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed) — The current policy takes precedence over old courses and blog posts.
- [Candidate handbook](https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2) — Check-in, identification, environment and proctoring requirements.
- [Kubernetes documentation](https://kubernetes.io/docs/) — Primary reference linked directly from each lesson.
- [Helm documentation](https://helm.sh/docs/) — Version-specific chart, release and command documentation.
- [Gateway API documentation](https://gateway-api.sigs.k8s.io/) — Installation, implementation selection, route examples and reference.
- [etcd disaster recovery](https://etcd.io/docs/v3.6/op-guide/recovery/) — Snapshot integrity, restore membership and Kubernetes revision bump guidance.
- [Techiescamp CKA guide](https://github.com/techiescamp/cka-certification-guide) — User-supplied community roadmap. Consulted for topic discovery; this handbook uses original teaching text and exercises.
- [DevOpsCube](https://devopscube.com/) — User-supplied Kubernetes tutorials and practical administration articles.
- [DevOpsCube CKA course](https://courses.devopscube.com/p/certified-kubernetes-administrator-course) — User-supplied course reference. Not required for this free study path; access terms may vary.
- [Killercoda Kubernetes playground](https://killercoda.com/playgrounds/scenario/kubernetes) — Browser-based practice; check current session and account limits. No paid course is required for the local labs in this guide.
- [Killer.sh](https://killer.sh/) — Optional exam simulator. Some exam packages include access; check your purchase entitlement. Not a prerequisite or universally free.
- [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way) — Deep architecture extension. Helpful for understanding, not a prerequisite for completing this CKA study path.
- [CNCF Gateway API 101](https://www.cncf.io/online-programs/cloud-native-live-gateway-api-101-with-linkerd/) — Additional free recorded session covering Gateway API concepts and gotchas.
