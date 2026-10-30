'use strict';
const K='https://kubernetes.io/docs/';
const domains=[
{id:'cluster',title:'Cluster Architecture, Installation & Configuration',short:'Cluster architecture',weight:25,icon:'⬡',desc:'Build, secure, extend and maintain a Kubernetes cluster.'},
{id:'workloads',title:'Workloads & Scheduling',short:'Workloads & scheduling',weight:15,icon:'▦',desc:'Deploy applications and control where and how they run.'},
{id:'networking',title:'Services & Networking',short:'Services & networking',weight:20,icon:'⇄',desc:'Connect Pods, expose applications and manage traffic.'},
{id:'storage',title:'Storage',short:'Storage',weight:10,icon:'▱',desc:'Provision, mount and troubleshoot persistent application data.'},
{id:'troubleshooting',title:'Troubleshooting',short:'Troubleshooting',weight:30,icon:'⌘',desc:'Find the evidence. Fix the cause. Verify the recovery.'}
];
const videos={
foundation:{id:'X48VuDVv0do',title:'Kubernetes Tutorial for Beginners · 4-hour course',author:'TechWorld with Nana',note:'2020 fundamentals course. Use current documentation for APIs and installation. This is background learning, not complete coverage of today’s CKA.'},
helm:{id:'w51lDVuRWuk',title:'Helm and Helm Charts Explained',author:'DevOps Journey',note:'Conceptual introduction; compare commands with the installed Helm version.'},
kustomize:{id:'Ks0PMh70GTY',title:'Kustomize explained with a hands-on demo',author:'Abhishek Veeramalla',note:'Published February 2025. Follow with the local overlay exercise.'},
};
const lessons=[];
function lesson(id,domain,title,minutes,concept,steps,command,verify,pitfall,doc,video){lessons.push({id,domain,title,minutes,concept,steps,command,verify,pitfall,doc:doc.startsWith('http')?doc:K+doc,video});}
lesson('terminal','foundations','Linux, YAML & a fast terminal',35,
`Kubernetes administration combines Linux processes, networking and declarative configuration. Know SSH, sudo, systemd, file permissions, pipes, grep, curl and a terminal editor. YAML uses spaces: a list item begins with a dash; nested fields must align. apiVersion, kind, metadata and spec identify and describe an object. kubectl talks to the API server using your kubeconfig.`,
['Practice editing a file with vi: i inserts, Esc exits insert mode, :wq saves, :q! discards. Use :set paste when pasting YAML if needed.','Install kubectl using the official installation instructions for your OS. Practice completion and use kubectl explain to discover fields.','Generate a Pod manifest, inspect it, validate it against a disposable cluster and apply it.'],
`alias k=kubectl
source <(kubectl completion bash)
complete -o default -F __start_kubectl k
kubectl run web --image=nginx:stable --dry-run=client -o yaml > web.yaml
kubectl explain pod.spec.containers --recursive
kubectl apply --dry-run=server -f web.yaml
kubectl apply -f web.yaml
kubectl get pod web -o wide`,
'Explain what metadata.name and spec.containers do. Confirm the Pod is Ready, then delete only your practice Pod with kubectl delete pod web.',
'Client dry-run generates objects; it does not validate admission policy or cluster-side behavior. A running container is not necessarily Ready.',
'reference/kubectl/quick-reference/','foundation');
lesson('lab-setup','foundations','Build your free practice environment',45,
`Use kind for inexpensive local API, workload and YAML practice. It runs Kubernetes nodes as containers and needs a working supported container runtime plus kubectl and kind installed. Reserve roughly 4 CPUs and 8 GB RAM for a comfortable small lab; requirements vary. Use disposable Linux VMs for systemd, kubeadm, host networking, upgrades and recovery. kind is not a substitute for host administration.`,
['Install Docker or another supported runtime, kind and kubectl from their official documentation. Confirm the runtime can start containers.','Save the configuration below as kind.yaml; run the create command separately after saving.','Wait for nodes, create the practice namespace and check you are using the kind-cka context. For advanced labs create one control-plane VM and two workers with SSH and sudo.'],
`# kind.yaml
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
# kubectl create namespace practice`,
'kubectl get nodes should show three Ready nodes. A Pod in practice should start. NetworkPolicy labs need an enforcing CNI; kind’s default networking does not enforce those policies.',
'Keep experiments isolated. kind delete cluster --name cka destroys that entire practice cluster. Do not run it against a cluster you need.',
'https://kind.sigs.k8s.io/docs/user/quick-start/','foundation');
lesson('contexts','foundations','Contexts, namespaces & safe task execution',20,
`A context combines a cluster, identity and default namespace. Many exam errors come from correct commands against the wrong target. Begin every task by confirming the requested context and namespace; repeat this after SSH. Namespaces isolate names, not all security or networking. Nodes, PersistentVolumes and ClusterRoles are cluster scoped.`,
['List contexts and switch to your disposable practice cluster.','Create practice if it does not exist. Set its namespace in the current context.','Use explicit -n for important commands; inspect a resource before modifying it.'],
`kubectl config get-contexts
kubectl config current-context
kubectl config use-context kind-cka
kubectl create namespace practice --dry-run=client -o yaml | kubectl apply -f -
kubectl config set-context --current --namespace=practice
kubectl get pods -n practice
kubectl api-resources --namespaced=false`,
'Identify the active cluster and user with kubectl config view --minify. Explain why a PV does not take -n practice.',
'Use the exact context and SSH destination in each task. Do not assume your previous task’s namespace is still correct.',
'concepts/configuration/organize-cluster-access-kubeconfig/');
lesson('architecture','cluster','Understand the control plane & node components',30,
`The API server authenticates requests and exposes cluster state. etcd persists that state. The scheduler selects nodes for unscheduled Pods; controllers reconcile desired and observed state. On each node, kubelet runs assigned Pods through the container runtime’s CRI. A CNI provides Pod networking; a Service data plane (often kube-proxy or an alternative) handles Service traffic.`,
['Draw the request flow from kubectl to API server to etcd, and from a new Pod through scheduling to kubelet.','Inspect system Pods and node details. On a kubeadm VM find static Pod manifests under /etc/kubernetes/manifests.','Stop using deprecated componentstatuses as a health signal; use readiness, component logs and node conditions.'],
`kubectl get nodes -o wide
kubectl -n kube-system get pods -o wide
kubectl describe node
kubectl get --raw='/readyz?verbose'
# On a kubeadm control-plane VM:
sudo ls /etc/kubernetes/manifests
sudo systemctl status kubelet --no-pager`,
'Explain what fails when the scheduler stops versus when etcd stops. Locate the kube-apiserver static Pod and its host manifest.',
'Static Pods are supervised by kubelet. Deleting their mirror Pod through kubectl does not remove their source manifest.',
'concepts/architecture/','foundation');
lesson('kubeadm','cluster','Bootstrap a cluster with kubeadm',90,
`kubeadm bootstraps a control plane and joins nodes; it does not provision machines or choose a CNI. Use disposable Linux VMs with routable node addresses, unique hostnames, supported CRI runtimes, compatible kubelet/kubeadm/kubectl and required ports. Align runtime and kubelet cgroup drivers. Follow the version-specific installation guide rather than mixing repositories.`,
['Prepare every VM: kernel modules, forwarding, runtime and swap behavior following the installation docs. Unless deliberately configuring supported swap, turn swap off and prevent its return after reboot.','Install matching Kubernetes packages from the pkgs.k8s.io repository for your target minor release. Record exact versions; hold packages where appropriate.','On the first control-plane VM run kubeadm init with the CNI’s required Pod CIDR and reachable API address. Copy the admin kubeconfig only to the intended administrator.','Install one compatible CNI from its official instructions. Run the generated join command on workers.'],
`# Illustrative control-plane bootstrap; replace the address and CIDR.
sudo kubeadm init --apiserver-advertise-address=CONTROL_PLANE_IP --pod-network-cidr=POD_CIDR
mkdir -p "$HOME/.kube"
sudo cp /etc/kubernetes/admin.conf "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
# Install your chosen CNI now using its version-matched official guide.
kubectl get nodes
# Generate a worker join command if the original was lost:
sudo kubeadm token create --print-join-command`,
'All nodes become Ready, CoreDNS becomes Ready, and Pods on different nodes communicate. Confirm you can resolve kubernetes.default from a test Pod.',
'CONTROL_PLANE_IP and POD_CIDR are placeholders. Do not run this as pasted. Joining requires the generated token and discovery CA hash; do not bypass CA verification.',
'setup/production-environment/tools/kubeadm/create-cluster-kubeadm/');
lesson('ha','cluster','Plan a highly available control plane',35,
`High availability requires a stable API endpoint, multiple control-plane nodes, and etcd quorum. Stacked etcd shares control-plane machines; external etcd uses separate hosts. A three-member etcd cluster tolerates one failed member. A load balancer must route to healthy API servers and must not become your single point of failure.`,
['Sketch three control-plane VMs, a stable load-balanced endpoint and worker nodes. Distinguish the API endpoint from an individual node IP.','Read kubeadm’s HA prerequisites and certificate transfer options. Join additional control-plane nodes with --control-plane using freshly generated join information.','In a disposable HA lab, stop one control-plane VM and verify the stable endpoint still accepts requests.'],
`# Initial bootstrap shape; placeholders must be configured first:
sudo kubeadm init --control-plane-endpoint "API_DNS:6443" --upload-certs
# Inspect current API endpoint and system workload placement:
kubectl config view --minify
kubectl -n kube-system get pods -o wide
# Check certificate expiration on a control-plane VM:
sudo kubeadm certs check-expiration`,
'Explain the quorum requirement and show API availability with one member unavailable. Restore that member before another failure test.',
'Never publish certificate keys or join tokens. Two etcd members do not tolerate the loss of one member.',
'setup/production-environment/tools/kubeadm/high-availability/');
lesson('rbac','cluster','Grant least-privilege access with RBAC',35,
`RBAC binds permissions to subjects. A Role grants verbs on resources within a namespace; a ClusterRole defines reusable or cluster-scoped permissions. RoleBinding scopes a grant to a namespace; ClusterRoleBinding grants cluster-wide access. ServiceAccounts identify workloads. Authentication answers who; authorization answers what they may do.`,
['Create a ServiceAccount named reader in practice.','Grant only get, list and watch on Pods in that namespace.','Check both an allowed operation and a forbidden operation by impersonating the ServiceAccount.'],
`kubectl -n practice create serviceaccount reader
kubectl -n practice create role pod-reader --verb=get,list,watch --resource=pods
kubectl -n practice create rolebinding reader-pods --role=pod-reader --serviceaccount=practice:reader
kubectl auth can-i list pods -n practice --as=system:serviceaccount:practice:reader
kubectl auth can-i delete pods -n practice --as=system:serviceaccount:practice:reader`,
'The list check returns yes and delete returns no. A check for list pods in default also returns no, assuming no other grants exist.',
'Impersonation itself requires permission. Namespaced RBAC does not grant access to cluster-scoped Nodes. Avoid using cluster-admin to solve a narrow access task.',
'reference/access-authn-authz/rbac/');
lesson('upgrade','cluster','Upgrade a kubeadm cluster safely',75,
`Upgrade one supported minor version at a time, starting with the first control-plane node, then other control planes and workers. Read the version-skew policy and target release guide. Back up etcd and configuration first. Drain evicts eligible workloads; PodDisruptionBudgets, unmanaged Pods and local data can prevent safe eviction.`,
['On disposable VMs record current versions, take a verified backup and inspect the target version’s upgrade notes. Update the minor-specific package repository when necessary.','Install the exact target kubeadm package on the first control plane. Run kubeadm upgrade plan, then kubeadm upgrade apply with the selected version.','Drain the node, upgrade kubelet/kubectl as appropriate, reload systemd, restart kubelet and uncordon. Repeat node-by-node; use kubeadm upgrade node on subsequent control planes and workers.','Validate node versions, system Pods and application connectivity after each node.'],
`# FIRST CONTROL PLANE: install target kubeadm using your OS package manager first.
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
# OTHER NODES: after updating kubeadm, use sudo kubeadm upgrade node`,
'Each upgraded node is Ready with the intended version. Workloads recover and all nodes are uncordoned. Record before/after versions.',
'This is a procedure template, not a one-shot script. Replace placeholders and follow the target release docs. Do not add --force or --delete-emptydir-data without understanding the specific workload impact.',
'https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/');
lesson('helm','cluster','Install & manage components with Helm',40,
`A chart packages Kubernetes templates and defaults. A release is an installed instance with revision history; values customize it. Inspect rendered manifests before installing. Helm talks to the selected kubeconfig context, so the same targeting discipline applies. Use the installed tool’s help and docs: older videos may describe obsolete Helm behavior.`,
['Use helm create to make a local practice chart; no paid chart repository is required. Inspect Chart.yaml, values.yaml and templates.','Render and lint it, then install into practice. Inspect the resources it creates.','Change replicaCount, upgrade, inspect history and roll back to revision 1.'],
`helm create cka-demo
helm lint ./cka-demo
helm template demo ./cka-demo --namespace practice
helm install demo ./cka-demo -n practice --set replicaCount=1
helm list -n practice
helm upgrade demo ./cka-demo -n practice --set replicaCount=2
helm history demo -n practice
helm rollback demo 1 -n practice
helm status demo -n practice
# Cleanup only this release:
# helm uninstall demo -n practice`,
'Observe two replicas after upgrade and one after rollback. Confirm the release namespace and revision with helm history.',
'Chart value keys are chart-specific. Use helm show values for unfamiliar charts. Helm lint alone does not prove a chart will run successfully.',
'https://helm.sh/docs/intro/quickstart/','helm');
lesson('kustomize','cluster','Compose environments with Kustomize',40,
`Kustomize transforms plain Kubernetes manifests using a kustomization.yaml. A base contains shared resources; an overlay changes a base for an environment. kubectl includes Kustomize through -k. Render first to catch selector, namespace and naming changes before applying.`,
['Create a base directory and generate a Deployment named web into base/deployment.yaml.','Create the two kustomization.yaml files below in their indicated directories.','Render the development overlay; confirm three replicas and the practice namespace before applying.'],
`mkdir -p base overlays/dev
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
kubectl -n practice rollout status deployment/web`,
'The rendered Deployment has namespace practice and replicas 3. kubectl -n practice get deployment web reports 3 available replicas.',
'Use -k with a directory, not -f with kustomization.yaml. Never assume an overlay automatically creates its namespace.',
'https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/','kustomize');
lesson('operators','cluster','CRDs, custom resources & operators',35,
`A CustomResourceDefinition adds an API type; a custom resource is an instance of it. An operator is a controller that watches resources and implements reconciliation. Registering a CRD does not install a controller or perform application operations. Operators commonly have CRDs, RBAC, a Deployment and custom resources.`,
['Inspect installed CRDs in a cluster with an operator. If none exist, install an operator only in a disposable cluster using its official manifests or chart.','Use api-resources and explain to discover its group, version, kind, scope and schema. Create a small instance following that operator’s documentation.','Inspect status.conditions, operator logs, RBAC and events; change a supported spec field and observe reconciliation.'],
`kubectl get crds
kubectl api-resources
# Replace these names with a CRD installed in your lab:
kubectl describe crd CRD_NAME
kubectl explain RESOURCE_NAME.spec
kubectl get RESOURCE_NAME -A
kubectl -n OPERATOR_NAMESPACE logs deployment/OPERATOR_DEPLOYMENT --tail=100`,
'Identify which controller acts on the custom resource and show a successful Ready or equivalent status condition defined by that operator.',
'All uppercase identifiers here are placeholders. Deleting a CRD can delete every instance of its type. Finalizers may deliberately delay removal while a controller cleans up.',
'concepts/extend-kubernetes/operator/');
lesson('interfaces','cluster','Understand CNI, CSI & CRI interfaces',25,
`CRI connects kubelet to runtimes such as containerd or CRI-O. CNI configures Pod networking through plugins. CSI lets storage drivers provision, attach and mount volumes. They solve different problems: a runtime failure, a sandbox network failure and a volume mount failure need different evidence.`,
['Describe a node to identify its runtime. Locate runtime and CNI configuration on a disposable VM.','Inspect CNI DaemonSets and installed CSI drivers.','Relate FailedCreatePodSandBox to runtime/network checks and FailedMount to volume/driver checks.'],
`kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.nodeInfo.containerRuntimeVersion}{"\\n"}{end}'
kubectl -n kube-system get daemonsets
kubectl get csidrivers
# On a lab VM:
sudo crictl info
sudo ls /etc/cni/net.d
sudo ls /opt/cni/bin`,
'Name the actual runtime, network plugin and storage provisioner in your lab. Explain why installing a CSI driver cannot repair a broken Pod network.',
'Docker CLI is not the generic Kubernetes runtime debugging interface. crictl needs the correct runtime endpoint and sufficient permissions.',
'concepts/architecture/cri/');
lesson('deployments','workloads','Deploy, scale, update & roll back',35,
`A Deployment manages ReplicaSets, which maintain Pods. Change the Pod template to trigger a rollout. RollingUpdate balances extra capacity (maxSurge) and unavailable Pods (maxUnavailable); availability also depends on readiness, replicas, capacity and traffic routing. Recreate removes old Pods before creating replacements.`,
['Create a three-replica web Deployment in practice and wait for availability.','Update its image, inspect rollout status and revision history.','Roll back, then inspect ReplicaSets to explain which revision is active.'],
`kubectl -n practice create deployment web --image=nginx:stable --replicas=3
kubectl -n practice rollout status deployment/web
kubectl -n practice set image deployment/web nginx=nginx:alpine
kubectl -n practice rollout status deployment/web --timeout=120s
kubectl -n practice rollout history deployment/web
kubectl -n practice rollout undo deployment/web
kubectl -n practice get deployment,replicaset,pods -l app=web`,
'Three Pods are Ready and the final Pod template uses the original image. Explain why changing a ConfigMap alone does not create a Deployment revision.',
'The container name nginx comes from the generated Deployment; check it before set image. Reuse or delete existing web resources from earlier labs intentionally.',
'concepts/workloads/controllers/deployment/','foundation');
lesson('config','workloads','ConfigMaps, Secrets & workload configuration',30,
`ConfigMaps hold non-confidential settings; Secrets hold sensitive data but base64 is encoding, not encryption. A workload can consume them as environment variables or files. Environment variables are read at startup. Projected file updates have different timing; subPath mounts do not receive automated updates. Keep secrets out of source control.`,
['Create a ConfigMap and a demonstration Secret using fake data.','Create a Pod from the YAML example and read its environment variable.','Change the ConfigMap value and recreate the Pod; explain why the existing environment did not update.'],
`kubectl -n practice create configmap app-config --from-literal=MODE=study
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
kubectl -n practice exec config-demo -- printenv MODE`,
'The command prints study. Inspect the manifest and describe output without dumping any real Secret values.',
'ConfigMap and Secret references must exist in the Pod’s namespace. A missing required reference can produce CreateContainerConfigError.',
'concepts/configuration/configmap/');
lesson('resources','workloads','Requests, limits, quotas & autoscaling',40,
`The scheduler uses requests to place Pods. CPU limits can throttle a container; memory limits can result in OOM termination. A ResourceQuota caps aggregate namespace consumption and LimitRange can supply defaults. HPA adjusts replicas based on metrics, and CPU utilization targets require CPU requests plus a working metrics pipeline.`,
['Add CPU and memory requests and limits to the web Deployment.','Inspect scheduling and resource allocation. Check metrics availability.','Create an HPA and inspect its conditions; diagnose missing metrics before assuming autoscaling is broken.'],
`kubectl -n practice set resources deployment web --requests=cpu=100m,memory=64Mi --limits=cpu=500m,memory=128Mi
kubectl -n practice rollout status deployment/web
kubectl top nodes
kubectl top pods -n practice
kubectl -n practice autoscale deployment web --cpu-percent=60 --min=2 --max=5
kubectl -n practice get hpa
kubectl -n practice describe hpa web
kubectl -n practice get resourcequota,limitrange`,
'Explain 100m as one tenth of a CPU. HPA shows valid metrics when metrics-server is installed and healthy; otherwise record the actual missing dependency.',
'kind does not guarantee metrics-server is installed. A quota admission failure differs from a scheduler Pending event. Raising limits does not create physical node capacity.',
'tasks/run-application/horizontal-pod-autoscale/');
lesson('scheduling','workloads','Node selectors, affinity, taints & tolerations',40,
`nodeSelector requires matching node labels. Node affinity expresses required or preferred placement; inter-Pod affinity considers other Pods. Taints repel Pods unless they tolerate the taint. A toleration permits placement but does not force it. NoSchedule affects new placements; NoExecute can evict existing Pods.`,
['Choose a worker with kubectl get nodes, then label it disk=ssd.','Create a Pod with nodeSelector disk=ssd. Check its assigned node.','Taint a disposable worker dedicated=study:NoSchedule. Add a matching toleration and required selector to a second Pod; inspect scheduling events before and after.'],
`# Replace WORKER_NAME with one of your disposable workers.
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
# kubectl taint node WORKER_NAME dedicated=study:NoSchedule-`,
'The constrained Pod schedules to the labeled worker only when the taint is tolerated. Explain why a toleration alone can still place it on another eligible node.',
'Do not taint all nodes before understanding recovery. A typo in a required label leaves a Pod Pending. Fragment comments are not a complete Pod manifest.',
'concepts/scheduling-eviction/assign-pod-node/');
lesson('probes','workloads','Readiness, liveness & startup probes',35,
`Readiness determines whether a Pod should receive Service traffic. Liveness failure can restart a container. Startup probes delay readiness and liveness checks until startup succeeds. Choose endpoints and thresholds that measure the intended behavior; restarting a healthy app because a dependency is unavailable can amplify an outage.`,
['Export the web Deployment and add the probe fields below inside the nginx container.','Apply and inspect readiness, restart counts and events.','In the disposable copy set readiness path to a missing URL, observe unready endpoints, then repair the path.'],
`# Container-level fields for an nginx Deployment:
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
  periodSeconds: 2`,
'After correction all replicas are Ready. The bad readiness path removes traffic eligibility without necessarily restarting containers.',
'This YAML is a container fragment. Insert it beneath spec.template.spec.containers[]; do not apply it as a standalone object.',
'concepts/configuration/liveness-readiness-startup-probes/');
lesson('controllers','workloads','DaemonSets, StatefulSets, Jobs & static Pods',35,
`Use a DaemonSet for a node-local agent on eligible nodes. StatefulSets provide stable Pod identities and ordered behavior, often with per-Pod PVCs. Jobs run to completion; CronJobs schedule Jobs. Static Pods are managed directly by kubelet from host files. Choose the controller based on lifecycle, identity and placement requirements.`,
['Create a Job and confirm completion, then inspect logs.','Generate a CronJob manifest and inspect schedule, restart policy and concurrency settings.','Read one existing system DaemonSet. On a disposable kubeadm host, locate staticPodPath in the kubelet configuration.'],
`kubectl -n practice create job hello --image=busybox:1.36 -- sh -c 'echo hello-cka'
kubectl -n practice wait --for=condition=complete job/hello --timeout=90s
kubectl -n practice logs job/hello
kubectl -n practice create cronjob clock --image=busybox:1.36 --schedule='*/5 * * * *' --dry-run=client -o yaml -- sh -c date
kubectl -n kube-system get daemonsets
# On a kubeadm VM:
sudo cat /var/lib/kubelet/config.yaml`,
'The Job completes successfully and outputs hello-cka. Explain why a Deployment is a poor fit for a one-time migration.',
'Generating YAML does not create the CronJob. StatefulSet deletion does not imply all persistent data is removed. Never leave backup manifests in the watched static Pod directory.',
'concepts/workloads/controllers/');
lesson('services','networking','Services, selectors & EndpointSlices',35,
`A ClusterIP Service provides a stable virtual address for selected backends. NodePort adds a port on nodes; LoadBalancer integrates with an implementation that provisions external access. Headless Services expose backend addresses directly. A Service port can differ from targetPort; its selector must match Pod labels and readiness affects usable endpoints.`,
['Expose the web Deployment from the workloads lab as ClusterIP on port 80.','Inspect the Service selector, Pod labels and EndpointSlices.','Start an ephemeral client Pod and request web.practice.svc.cluster.local.'],
`kubectl -n practice expose deployment web --port=80 --target-port=80
kubectl -n practice get service web -o yaml
kubectl -n practice get pods --show-labels
kubectl -n practice get endpointslices -l kubernetes.io/service-name=web
kubectl -n practice run client --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- http://web.practice.svc.cluster.local`,
'An HTTP response comes back from nginx. EndpointSlices contain the Ready Pod IPs and the target port is 80.',
'EXTERNAL-IP Pending is expected without a LoadBalancer implementation. Port-forward tests API-mediated access, not the complete in-cluster Service networking path.',
'concepts/services-networking/service/','foundation');
lesson('dns','networking','Cluster DNS & Pod networking',30,
`Pods get their own IP addresses and can communicate through the cluster’s network implementation. CoreDNS typically serves cluster DNS; Services receive names like service.namespace.svc.cluster.local. A short name uses the client Pod’s namespace search path. Separate DNS failure from connection failure by testing a name and an IP independently.`,
['Use a test Pod to resolve kubernetes.default and web.practice.svc.cluster.local.','Inspect the Pod’s resolv.conf and CoreDNS Service and Deployment.','If names fail, inspect CoreDNS logs, endpoints, Pod DNS policy, NetworkPolicy and network reachability.'],
`kubectl -n practice run dnscheck --rm -it --restart=Never --image=busybox:1.36 -- sh
# Inside the test Pod:
# cat /etc/resolv.conf
# nslookup kubernetes.default.svc.cluster.local
# nslookup web.practice.svc.cluster.local
# wget -qO- http://web.practice.svc.cluster.local
# exit
kubectl -n kube-system get deployment coredns
kubectl -n kube-system get service kube-dns
kubectl -n kube-system logs deployment/coredns --tail=50`,
'Both names resolve. Explain why a Pod in another namespace needs web.practice rather than just web.',
'The cluster domain and DNS labels can differ in custom clusters. Do not blindly replace a CoreDNS ConfigMap with one from a different environment.',
'concepts/services-networking/dns-pod-service/');
lesson('networkpolicy','networking','Isolate traffic with NetworkPolicy',45,
`NetworkPolicies select Pods and allow ingress or egress at network level, enforced by a compatible CNI. Without a selecting policy, traffic is generally not isolated in that direction. Selecting an empty ingress rule list denies inbound traffic to selected Pods; allow rules from all policies combine. Namespace and Pod selectors in the same peer are ANDed; separate peers are ORed.`,
['Use a cluster with policy enforcement and the running web Service.','Apply the policy below to allow only Pods labeled access=true in practice to reach app=web on TCP 80.','Test from both labeled and unlabeled clients; compare actual connectivity. For egress isolation, allow DNS UDP and TCP 53 to the correct DNS endpoints as well as required app traffic.'],
`apiVersion: networking.k8s.io/v1
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
      port: 80`,
'In a clean policy-enabled lab the labeled client succeeds and the unlabeled client times out. Inspect other policies if both succeed.',
'The default kind CNI does not enforce NetworkPolicy. A successful kubectl apply proves the API accepted the object, not that packets are filtered.',
'concepts/services-networking/network-policies/');
lesson('ingress','networking','Route HTTP traffic with Ingress',35,
`Ingress describes HTTP(S) host and path routing to Services. An Ingress controller must implement it; creating an object alone does not expose traffic. ingressClassName selects a controller class. Exact, Prefix and ImplementationSpecific path types differ. TLS commonly references a same-namespace Secret with a certificate and private key.`,
['Install a supported Ingress controller in your disposable lab using its official instructions. Discover its IngressClass.','Apply the manifest below after replacing CLASS_NAME with an installed class.','Send a request with Host: web.example.test to the controller’s reachable address, then test a nonmatching path.'],
`apiVersion: networking.k8s.io/v1
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
              number: 80`,
'kubectl describe ingress web -n practice identifies the intended backend and curl -H "Host: web.example.test" http://CONTROLLER_ADDRESS returns nginx.',
'Replace placeholders. A controller may not have a public address in a local lab. Ingress is still an objective even though Gateway API is the newer model.',
'concepts/services-networking/ingress/');
lesson('gateway','networking','Gateway API: classes, listeners & HTTPRoutes',45,
`GatewayClass identifies a controller; Gateway configures listeners; HTTPRoute attaches routing rules to a Gateway. Gateway API requires its CRDs and a compatible controller. Check status conditions to distinguish an accepted route from a working data plane. Cross-namespace references may need ReferenceGrant and listener permissions.`,
['Follow the official getting-started guide to install CRDs and an implementation in a disposable lab. Find an installed GatewayClass.','Create a Gateway with an HTTP listener and allowedRoutes for your namespace. Then apply the HTTPRoute below referencing that Gateway.','Inspect Accepted, ResolvedRefs and Programmed conditions where exposed, and test with the configured hostname against the Gateway address.'],
`# Prerequisite: Gateway web-gateway in practice, HTTP listener on port 80.
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
# kubectl -n practice describe httproute web-route`,
'The route is accepted, backend references resolve and an HTTP request reaches web through the Gateway. Explain why CRDs without a controller cannot route traffic.',
'This route intentionally assumes an existing Gateway. Use your implementation’s GatewayClass and setup instructions; no universal controller name works everywhere.',
'https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/');
lesson('pv-pvc','storage','PersistentVolumes, claims & access modes',40,
`A PersistentVolume describes provisioned storage; a PersistentVolumeClaim requests it; Pods mount claims. Matching involves class, capacity, access mode and volume mode. RWO means read-write from one node, not necessarily one Pod. RWOP requires supporting CSI storage. Reclaim policy controls what happens after a claim is released.`,
['Inspect available StorageClasses. For this static lab create the sample PV and PVC in a disposable single-node cluster.','Create a Pod mounting data at /data and write a file. Delete and recreate that Pod with the same claim.','Read the file after recreation; inspect Bound status and the Retain reclaim policy.'],
`apiVersion: v1
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
      storage: 1Gi`,
'The claim is Bound and the same file survives Pod replacement on the same lab node. Use kubectl get pv,pvc -n practice to inspect binding.',
'hostPath is for this single-node exercise only; it is neither portable shared storage nor a safe general production provisioner. In multi-node clusters use CSI or node-aware local volumes.',
'concepts/storage/persistent-volumes/');
lesson('mounts','storage','Mount volumes & understand data lifetime',30,
`emptyDir exists for a Pod’s lifetime and survives container restarts, but disappears with the Pod. PVC-backed data follows the volume lifecycle. ConfigMap and Secret volumes project configuration as files. Mount paths live inside containers; persistent storage must be explicitly attached through volumes and volumeMounts.`,
['After the PV/PVC lab, apply the Pod below. Write /data/note.txt.','Delete only the Pod and apply it again; read the file.','Compare that behavior with an emptyDir volume in another Pod.'],
`apiVersion: v1
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
# kubectl -n practice exec writer -- cat /data/note.txt`,
'The file remains after Pod recreation when the same backing storage is attached. Show that deleting an emptyDir Pod loses its file.',
'Deleting the claim may trigger backend deletion under a Delete reclaim policy. Inspect reclaim behavior before cleaning up storage.',
'concepts/storage/volumes/');
lesson('storageclass','storage','StorageClasses, dynamic provisioning & expansion',35,
`A StorageClass defines a provisioner, parameters, reclaim policy and binding behavior. Dynamic provisioning creates backing storage for a claim. WaitForFirstConsumer delays binding until scheduling can honor topology constraints. Expansion requires allowVolumeExpansion and driver support; increasing a claim does not allow shrinking it later.`,
['Inspect your lab’s StorageClass and CSI provisioner. Create a claim using an installed class and mount it in a consumer Pod.','Check whether binding waits for a consumer. Inspect events rather than treating all Pending claims as failures.','If the class and driver support it, increase the requested storage and observe claim, volume and filesystem conditions.'],
`kubectl get storageclass
kubectl describe storageclass CLASS_NAME
kubectl -n practice get pvc
kubectl -n practice describe pvc CLAIM_NAME
# Only for an expandable class and supported driver:
kubectl -n practice patch pvc CLAIM_NAME --type=merge -p '{"spec":{"resources":{"requests":{"storage":"2Gi"}}}}'
kubectl -n practice get pvc CLAIM_NAME -w`,
'Identify the provisioner, binding mode and reclaim policy. If expansion is supported, confirm capacity and filesystem growth rather than just the changed request.',
'CLASS_NAME and CLAIM_NAME are placeholders. Not every local provisioner supports resizing or topology. Do not edit PV capacity manually to simulate successful expansion.',
'concepts/storage/storage-classes/');
lesson('storage-debug','storage','Diagnose Pending claims & failed mounts',30,
`Follow storage from Pod event to PVC, PV, StorageClass, CSI controller and node plugin. A Pending claim can be normal with delayed binding or can indicate missing class, incompatible modes, capacity, selector or topology. A Bound claim does not prove the filesystem mounted successfully.`,
['Create a claim requesting a nonexistent class in a disposable namespace and inspect its events.','Compare the failed claim with a correctly Bound claim.','Inspect a Pod’s FailedMount or FailedAttachVolume events and follow the named driver’s logs; repair the class or mount configuration.'],
`kubectl -n practice get pods,pvc
kubectl -n practice describe pod writer
kubectl -n practice describe pvc data
kubectl get pv
kubectl get storageclass
kubectl get volumeattachments
kubectl -n kube-system get pods -o wide
kubectl -n practice get events --sort-by=.metadata.creationTimestamp`,
'Explain the actual failing stage and confirm both Bound PVC and Ready consumer Pod after correction. Write and read a test file.',
'Do not repeatedly delete claims to fix a mount problem. Data can be destroyed. First inspect events, attachment conflicts and node availability.',
'concepts/storage/persistent-volumes/');
lesson('triage','troubleshooting','A repeatable troubleshooting workflow',25,
`Start by defining expected and observed behavior. Verify context, namespace and task scope, then work from broad symptoms to specific evidence. Inspect status, events, configuration and logs. Change one plausible cause at a time and verify the original user-visible path, not just a green status field.`,
['Inventory nodes and workloads, then sort recent events.','Choose a failing object and inspect its detailed conditions. Use logs for the failing container, including --previous after a crash.','Write a short diagnosis: symptom, evidence, cause, minimal change, verification.'],
`kubectl config current-context
kubectl get nodes
kubectl get pods -A -o wide
kubectl get events -A --sort-by=.metadata.creationTimestamp
kubectl -n practice describe pod POD_NAME
kubectl -n practice logs POD_NAME -c CONTAINER_NAME --tail=100
kubectl -n practice logs POD_NAME -c CONTAINER_NAME --previous --tail=100`,
'For an original failure, show both the diagnostic evidence and a working end-to-end check after your fix.',
'Logs do not explain scheduling failures because the container may never have started. Read events first for Pending or ContainerCreating.',
'tasks/debug/');
lesson('pod-debug','troubleshooting','Fix Pending, image errors & CrashLoopBackOff',40,
`Pending often points to scheduling, PVCs or admission requirements. ImagePullBackOff indicates an image retrieval problem. CrashLoopBackOff is restart backoff after a container repeatedly exits; inspect exit codes, previous logs, probes, commands and configuration. OOMKilled points to memory termination but the reason still needs analysis.`,
['Create a Deployment with nginx:this-tag-does-not-exist-cka and inspect events.','Correct the image to nginx:stable and wait for rollout.','Create a second Pod that exits with code 1. Inspect previous logs and restart count; replace the incorrect command with a long-running workload.'],
`kubectl -n practice create deployment broken --image=nginx:this-tag-does-not-exist-cka
kubectl -n practice get pods -l app=broken
kubectl -n practice describe pods -l app=broken
kubectl -n practice set image deployment/broken nginx=nginx:stable
kubectl -n practice rollout status deployment/broken --timeout=120s
kubectl -n practice get pods -l app=broken -o wide`,
'Identify the image error in events and show the repaired Deployment Available. For the crash exercise explain the exit code and command, not just the restart count.',
'Restarting a Pod cannot fix a nonexistent image tag. Registry authentication, DNS, rate limits and node egress can also cause image pulls to fail.',
'https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/');
lesson('node-debug','troubleshooting','Recover a NotReady node & inspect the runtime',45,
`A node’s conditions expose Ready, MemoryPressure, DiskPressure and PIDPressure. kubelet reports node status; a failed runtime, bad CNI, expired credentials or exhausted disk can disrupt it. If the API is unavailable, host-level systemd and CRI tools become essential. Preserve evidence before restarting services.`,
['On a disposable worker VM stop kubelet and observe the node’s status after the control plane detects missed heartbeats.','SSH to that VM and inspect systemd, journal, disk, memory and runtime state.','Restart kubelet, wait for Ready, then verify existing workloads and scheduling.'],
`kubectl describe node WORKER_NAME
# Run on the affected lab node:
sudo systemctl status kubelet --no-pager
sudo journalctl -u kubelet -n 100 --no-pager
sudo systemctl status containerd --no-pager
sudo crictl ps -a
df -h
free -m
sudo systemctl restart kubelet
# Back in your administrator shell:
kubectl wait --for=condition=Ready node/WORKER_NAME --timeout=180s`,
'The node returns to Ready and its intended workloads are healthy. Record which host log proved the failure.',
'The runtime service name depends on the cluster. Stopping kubelet does not immediately stop running containers. Never use this failure injection on a shared or production node.',
'tasks/debug/debug-cluster/');
lesson('control-debug','troubleshooting','Repair control-plane static Pods & certificates',45,
`On kubeadm clusters, kubelet reads static Pod manifests for API server, scheduler, controller manager and often etcd. A malformed flag, missing file or bad certificate path can stop a component. Without API access, inspect CRI logs and host files. Back up manifests outside the watched directory before editing.`,
['In a disposable VM lab copy the chosen manifest to a directory outside /etc/kubernetes/manifests.','Introduce one reversible typo in a component flag, observe the failure and use crictl logs on the exited container.','Correct the flag and wait for kubelet reconciliation. Inspect certificate expiry and node time when TLS errors appear.'],
`sudo mkdir -p /root/cka-backups
sudo cp /etc/kubernetes/manifests/kube-apiserver.yaml /root/cka-backups/kube-apiserver.yaml
sudo crictl ps -a --name kube-apiserver
# Use a real container ID from the preceding output:
sudo crictl logs CONTAINER_ID
sudo journalctl -u kubelet -n 100 --no-pager
sudo kubeadm certs check-expiration
timedatectl
# After repairing the host manifest:
kubectl get --raw='/readyz?verbose'`,
'API readiness succeeds and system Pods recover. Explain the exact flag or certificate error found in the component log.',
'Do not blindly renew all certificates or restore unrelated manifests. Keep backup YAML outside the static manifest directory to avoid duplicate component Pods.',
'concepts/architecture/control-plane-node-communication/');
lesson('etcd','troubleshooting','Back up & restore etcd',70,
`etcd snapshots preserve Kubernetes API state. Use etcdctl for the live snapshot and etcdutl for offline validation and restore. A restore creates a new data directory; it is not simply copying a database into a running member. Match tool versions, inspect actual endpoints and TLS paths, and practice recovery on disposable kubeadm VMs only.`,
['Inspect the etcd static manifest for actual endpoint, certificate, key, member name and data paths. Verify etcdctl and etcdutl versions.','Save a snapshot with valid TLS credentials and check its status. Create a marker object after the snapshot so recovery has a visible effect.','For a single-member disposable recovery, stop kube-apiserver and etcd by moving their manifests outside the watched directory; wait until their containers stop. Restore into a new directory using the member configuration in the recovery docs.','Update the etcd manifest’s hostPath for its data volume to the restored directory, preserving the intended container mount path. Restore the etcd manifest first and then API server manifest. Wait for health and inspect the marker. Multi-member recovery requires coordinated membership configuration.'],
`# Common kubeadm paths ONLY; verify against the actual manifest first.
sudo etcdctl --endpoints=https://127.0.0.1:2379 \\
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/etcd/server.crt \\
  --key=/etc/kubernetes/pki/etcd/server.key \\
  snapshot save /root/cka-snapshot.db
sudo etcdutl snapshot status /root/cka-snapshot.db -w table
# Offline single-member restore shape: supply actual member parameters.
# Modern etcd recovery guidance recommends a revision bump for Kubernetes.
sudo etcdutl snapshot restore /root/cka-snapshot.db \\
  --data-dir=/var/lib/etcd-restored \\
  --bump-revision=1000000000 --mark-compacted
# Complete manifest/data-directory reconnection per the steps above.`,
'After recovery the API becomes Ready, pre-snapshot objects exist, post-snapshot marker changes are absent, nodes recover and workloads reconcile. The snapshot status command alone does not prove recovery.',
'The restore command is not the entire recovery procedure. Read the installed version’s help and recovery docs; member URLs, names and permissions may require explicit options. Never restore a production cluster as a practice exercise.',
'https://etcd.io/docs/v3.6/op-guide/recovery/');
lesson('service-debug','troubleshooting','Trace a broken Service end to end',35,
`Trace client → DNS → Service → EndpointSlice → Pod IP → listening container. A Service with no endpoints often has a selector mismatch or no Ready Pods. A connection refused at Pod IP usually needs application-port investigation. A timeout suggests routing, policy or a nonresponsive application, but always collect evidence.`,
['With a healthy web Deployment and Service, patch the Service selector to app=wrong.','Confirm the Service still exists but EndpointSlices no longer offer the expected backends.','Repair the selector and test HTTP from a new client. Then practice diagnosing targetPort and readiness mismatches separately.'],
`kubectl -n practice patch service web -p '{"spec":{"selector":{"app":"wrong"}}}'
kubectl -n practice get service web -o yaml
kubectl -n practice get endpointslices -l kubernetes.io/service-name=web
kubectl -n practice get pods --show-labels
kubectl -n practice patch service web -p '{"spec":{"selector":{"app":"web"}}}'
kubectl -n practice run probe --rm -it --restart=Never --image=busybox:1.36 -- wget -T 5 -qO- http://web`,
'HTTP works again from inside the cluster. Explain why restarting CoreDNS would not repair a mismatched Service selector.',
'Other NetworkPolicies from earlier labs may affect the probe. Inspect them or use a fresh practice namespace before interpreting results.',
'https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/');
lesson('monitoring','troubleshooting','Monitor resources, logs & cluster health',30,
`kubectl top reads resource metrics, not application logs or historical monitoring. describe exposes object events and state; logs reads container output. Multi-container Pods require selecting a container. System components may be static Pods, DaemonSets or host services, so choose the appropriate logging path.`,
['Inspect CPU and memory with top when metrics-server is available. Compare requests, limits and usage.','Read a workload’s recent timestamped logs and previous instance logs.','Sort events and correlate them with rollout and node condition changes.'],
`kubectl top nodes
kubectl top pods -A --sort-by=memory
kubectl -n practice logs deployment/web --all-containers=true --tail=50 --timestamps
kubectl -n practice describe deployment web
kubectl get events -A --sort-by=.metadata.creationTimestamp
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{range .status.conditions[?(@.type=="Ready")]}{.status}{end}{"\\n"}{end}'`,
'Find the highest-memory Pod when metrics are available and correlate one actual event with its workload condition.',
'No metrics is not proof of zero usage. top is a point-in-time signal; it cannot show yesterday’s OOM event or explain application correctness.',
'https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/');
const toolsList=[
['kubectl','Your Kubernetes API client. Read, create, patch, inspect and validate resources. Master get, describe, logs, exec, explain, auth can-i and rollout.',K+'reference/kubectl/quick-reference/'],
['kubeadm','Cluster bootstrap, node joining, certificate checks and coordinated upgrades. Practice it on disposable Linux VMs.',K+'setup/production-environment/tools/kubeadm/'],
['kubelet + systemd','Node agent and service management. Use systemctl and journalctl when Kubernetes API access is unavailable.',K+'reference/command-line-tools-reference/kubelet/'],
['containerd / CRI-O + crictl','Container runtimes implement CRI. crictl inspects images, sandboxes, containers and logs without Docker.',K+'tasks/debug/debug-cluster/crictl/'],
['etcdctl + etcdutl','Use etcdctl for live cluster operations and snapshots; use etcdutl for snapshot validation and offline recovery.','https://etcd.io/docs/v3.6/op-guide/recovery/'],
['Helm','Package templated resources into charts and manage releases, values, upgrades and rollbacks.','https://helm.sh/docs/'],
['Kustomize','Build bases and overlays from plain YAML. Available through kubectl kustomize and kubectl apply -k.',K+'tasks/manage-kubernetes-objects/kustomization/'],
['kind / minikube','Free local clusters for API and workload practice. VM-based minikube offers another local option. Neither replaces a deliberate kubeadm VM lab.','https://kind.sigs.k8s.io/docs/user/quick-start/'],
['CNI plugins','Provide Pod networking. NetworkPolicy requires a plugin that enforces it; use that plugin’s version-specific setup guide.',K+'concepts/cluster-administration/addons/'],
['CSI drivers','Provision, attach and mount supported persistent storage. Inspect driver and provisioner compatibility.',K+'concepts/storage/volumes/#csi'],
['CoreDNS','Cluster DNS. Debug name resolution independently from Service and application connectivity.',K+'tasks/administer-cluster/dns-debugging-resolution/'],
['Metrics Server','Provides resource metrics used by kubectl top and common HPA configurations. Not a complete monitoring stack.','https://github.com/kubernetes-sigs/metrics-server'],
['SSH, vi, curl, grep & journalctl','Navigate hosts, edit configuration, inspect service logs and test HTTP. Core Linux fluency saves exam time.','https://man7.org/linux/man-pages/']
];
const sources=[
['CNCF CKA overview','Official domain weights and performance-based exam format.','https://www.cncf.io/training/certification/cka/','Official'],
['CNCF curriculum','Canonical curriculum repository. Compare objectives again before booking.','https://github.com/cncf/curriculum/tree/master/cka','Official'],
['Linux Foundation FAQ','Live exam version, duration, passing score and registration details.','https://docs.linuxfoundation.org/tc-docs/certification/faq-cka-ckad-cks','Official'],
['Allowed exam resources','The current policy takes precedence over old courses and blog posts.','https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed','Official'],
['Candidate handbook','Check-in, identification, environment and proctoring requirements.','https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2','Official'],
['Kubernetes documentation','Primary reference linked directly from each lesson.','https://kubernetes.io/docs/','Official'],
['Helm documentation','Version-specific chart, release and command documentation.','https://helm.sh/docs/','Official'],
['Gateway API documentation','Installation, implementation selection, route examples and reference.','https://gateway-api.sigs.k8s.io/','Official'],
['etcd disaster recovery','Snapshot integrity, restore membership and Kubernetes revision bump guidance.','https://etcd.io/docs/v3.6/op-guide/recovery/','Official'],
['Techiescamp CKA guide','User-supplied community roadmap. Consulted for topic discovery; this handbook uses original teaching text and exercises.','https://github.com/techiescamp/cka-certification-guide','Community'],
['DevOpsCube','User-supplied Kubernetes tutorials and practical administration articles.','https://devopscube.com/','Community'],
['DevOpsCube CKA course','User-supplied course reference. Not required for this free study path; access terms may vary.','https://courses.devopscube.com/p/certified-kubernetes-administrator-course','Optional reference'],
['Killercoda Kubernetes playground','Browser-based practice; check current session and account limits. No paid course is required for the local labs in this guide.','https://killercoda.com/playgrounds/scenario/kubernetes','Practice'],
['Killer.sh','Optional exam simulator. Some exam packages include access; check your purchase entitlement. Not a prerequisite or universally free.','https://killer.sh/','Optional'],
['Kubernetes the Hard Way','Deep architecture extension. Helpful for understanding, not a prerequisite for completing this CKA study path.','https://github.com/kelseyhightower/kubernetes-the-hard-way','Extension'],
['CNCF Gateway API 101','Additional free recorded session covering Gateway API concepts and gotchas.','https://www.cncf.io/online-programs/cloud-native-live-gateway-api-101-with-linkerd/','Video']
];
const commands=[
['Targeting','Context and namespace','Always confirm the requested target before making a change.',`kubectl config get-contexts
kubectl config use-context CONTEXT_NAME
kubectl config set-context --current --namespace=NAMESPACE
kubectl config view --minify`],
['Discovery','Inspect resources and fields','Use explain instead of guessing schema fields.',`kubectl api-resources
kubectl explain deployment.spec.strategy
kubectl explain pod.spec.containers --recursive
kubectl get pods -A -o wide
kubectl get nodes --show-labels`],
['Create','Generate YAML quickly','Inspect and edit generated files before applying.',`kubectl run demo --image=nginx:stable --dry-run=client -o yaml > pod.yaml
kubectl create deployment demo --image=nginx:stable --replicas=3 --dry-run=client -o yaml > deploy.yaml
kubectl apply --dry-run=server -f deploy.yaml
kubectl diff -f deploy.yaml
kubectl apply -f deploy.yaml`],
['Workloads','Scale and roll out','Use the real container name when updating images.',`kubectl -n practice scale deployment web --replicas=3
kubectl -n practice set image deployment/web nginx=nginx:alpine
kubectl -n practice rollout status deployment/web
kubectl -n practice rollout history deployment/web
kubectl -n practice rollout undo deployment/web`],
['Troubleshooting','Events and logs','Replace POD and CONTAINER. --previous reads a previous terminated container instance.',`kubectl -n practice describe pod POD
kubectl -n practice logs POD -c CONTAINER --tail=100 --timestamps
kubectl -n practice logs POD -c CONTAINER --previous
kubectl get events -A --sort-by=.metadata.creationTimestamp`],
['Troubleshooting','Node and runtime','Run host commands on the affected node. Runtime service and endpoint vary.',`sudo systemctl status kubelet --no-pager
sudo journalctl -u kubelet -n 100 --no-pager
sudo crictl info
sudo crictl ps -a
sudo crictl logs CONTAINER_ID
df -h
free -m`],
['Networking','Trace Service endpoints','Check labels, readiness, targetPort and policy.',`kubectl -n practice get service web -o yaml
kubectl -n practice get pods --show-labels
kubectl -n practice get endpointslices -l kubernetes.io/service-name=web
kubectl -n practice run nettest --rm -it --restart=Never --image=busybox:1.36 -- sh`],
['Networking','Inspect routing and policy','Gateway resources exist only after their CRDs are installed.',`kubectl get ingressclass
kubectl -n practice describe ingress web
kubectl get gatewayclass
kubectl -n practice describe gateway web-gateway
kubectl -n practice describe httproute web-route
kubectl -n practice get networkpolicy`],
['Security','RBAC checks','Test both the permitted and forbidden operation.',`kubectl auth can-i list pods -n practice --as=system:serviceaccount:practice:reader
kubectl auth can-i delete pods -n practice --as=system:serviceaccount:practice:reader
kubectl -n practice get role,rolebinding
kubectl get clusterrole,clusterrolebinding`],
['Storage','Claims and provisioning','A Bound claim is only one stage of a working volume mount.',`kubectl get storageclass
kubectl get pv
kubectl -n practice get pvc
kubectl -n practice describe pvc data
kubectl -n practice describe pod writer
kubectl get volumeattachments`],
['Maintenance','Drain and resume scheduling','Replace NODE; inspect PDBs and local data before evicting anything.',`kubectl get pdb -A
kubectl cordon NODE
kubectl drain NODE --ignore-daemonsets
kubectl uncordon NODE
kubectl get nodes -o wide`],
['Helm','Chart and release lifecycle','Substitute a chart path or a configured repo/chart.',`helm list -A
helm show values CHART
helm template RELEASE CHART -n practice -f values.yaml
helm upgrade --install RELEASE CHART -n practice -f values.yaml
helm history RELEASE -n practice
helm rollback RELEASE REVISION -n practice`],
['Kustomize','Render and apply overlays','Review rendered output first.',`kubectl kustomize overlays/dev
kubectl diff -k overlays/dev
kubectl apply -k overlays/dev`],
['Output','JSONPath and sorting','Useful for extracting the exact value a task requests.',`kubectl get pods -A --sort-by=.spec.nodeName
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\\n"}{end}'
kubectl -n practice get pods -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,PHASE:.status.phase`],
['Monitoring','Resource metrics','Requires a functioning metrics API.',`kubectl top nodes
kubectl top pods -A --sort-by=cpu
kubectl -n practice describe hpa
kubectl get --raw='/readyz?verbose'`]
];
const weeks=[
['Foundations & your lab',['Linux, vi, YAML, containers and TCP/IP refresh','Install kubectl and create a local three-node kind cluster','Practice contexts, namespaces, dry-run, explain and output formats','Build disposable kubeadm VMs for host-level work']],
['Build & administer clusters',['Understand all control-plane and node components','Bootstrap kubeadm and join workers; explain HA and quorum','Implement least-privilege ServiceAccount access','Complete Helm, Kustomize, CRD and operator exercises']],
['Workloads & placement',['Create, scale, update and roll back Deployments','Consume ConfigMaps and Secrets','Configure probes, requests, limits, quotas and HPA','Practice node selection, affinity, taints and controllers']],
['Network & persist data',['Trace ClusterIP, NodePort, DNS and EndpointSlices','Test NetworkPolicy with an enforcing CNI','Configure Ingress and Gateway API with actual controllers','Create PV/PVC consumers and diagnose storage binding']],
['Break, diagnose, recover',['Repair image errors, crashing Pods and wrong selectors','Recover kubelet and a broken control-plane manifest in VMs','Take, validate and restore an etcd snapshot','Perform a version-specific kubeadm upgrade and verify workloads']],
['Timed practice & exam readiness',['Attempt mock A for 120 minutes without solutions','Rebuild missed labs from a clean environment','Attempt mock B, recording objective evidence for each task','Review handbook, allowed resources, system check and ID requirements']]
];
const mockA=[
['RBAC',10,'In namespace mock-a create ServiceAccount observer. Grant get/list/watch on Pods in mock-a only. Do not allow deletion.','Use a namespaced Role and RoleBinding. Check list=yes and delete=no using --as=system:serviceaccount:mock-a:observer.'],
['Helm',8,'Create a local chart with helm create. Install release study in mock-a, upgrade to two replicas, then roll back to the first revision.','Render first. Verify helm history and the final Deployment replica count.'],
['Kustomize',7,'Create a base Deployment and a development overlay setting namespace mock-a and replicas=3. Render and apply it.','Verify the rendered object and three Ready replicas. Use -k with the directory.'],
['Deployment',10,'Create Deployment api with nginx:stable and three replicas. Configure CPU request 100m and memory limit 128Mi. Update the image to nginx:alpine, then undo the rollout.','Use rollout status after each change. Check the current template image, limits and Ready replica count.'],
['Placement',5,'Label a disposable worker exam=target. Schedule a new Pod onto that worker with a required selector.','Use nodeSelector or required node affinity. Verify spec.nodeName matches the labeled worker.'],
['Service',8,'Expose api as ClusterIP on port 8080 targeting port 80. Verify an HTTP request from a client Pod.','Inspect EndpointSlices and use http://api.mock-a.svc.cluster.local:8080.'],
['NetworkPolicy',6,'With an enforcing CNI, allow TCP 80 ingress to app=api only from Pods labeled allowed=true in mock-a.','Use isolated fresh namespace and test positive and negative clients. Applying a policy without traffic tests earns no credit.'],
['Gateway API',6,'Using an installed GatewayClass/controller, create an HTTP Gateway and HTTPRoute for api.example.test to the api Service on port 8080.','Inspect listener and parent status; test Host header against the reachable Gateway.'],
['Persistent data',10,'Create a 1Gi PVC using a working class and mount it at /data. Write a file; recreate the consumer Pod and read it.','Verify Bound, Ready and file contents. Use supported CSI or the single-node static lab.'],
['Image failure',10,'Create a broken Deployment using nginx:this-tag-does-not-exist-cka. Diagnose and repair it without deleting the Deployment.','Read events, correct the template image and confirm rollout availability.'],
['Service failure',10,'Break the api Service selector deliberately. Find the cause using EndpointSlices and labels, repair it and prove HTTP works.','Evidence should include the selector mismatch, restored endpoints and successful request.'],
['Node failure',10,'On a disposable worker VM stop kubelet. Diagnose from host logs and recover the node.','Use systemctl/journalctl and verify node Ready plus healthy workload connectivity.']
];
const mockB=[
['Bootstrap & HA plan',10,'On clean disposable VMs, bootstrap one kubeadm control plane and join one worker. Explain the changes needed for three control planes with an API load balancer.','Follow current install docs, CNI requirements and version compatibility. Verify Ready nodes, DNS and cross-node traffic.'],
['Upgrade',8,'Upgrade a disposable kubeadm cluster to the next supported minor release following the target version guide.','Take a backup, update kubeadm first, plan/apply on first control plane, upgrade node on others, update kubelet, drain/uncordon and verify.'],
['Operator',7,'Using a documented operator, install its CRDs and controller; create a small custom resource and inspect reconciliation.','Show CRD registration, operator Deployment health, custom resource status and logs. Do not claim success from CRD installation alone.'],
['Probes & config',10,'Deploy nginx with an HTTP readiness probe and a ConfigMap environment variable. Break only readiness and explain the traffic effect, then repair it.','Check Ready condition and EndpointSlices; show that readiness failure alone is not a liveness restart.'],
['Taints & tolerations',5,'Taint one disposable worker dedicated=study:NoSchedule. Create a Pod constrained to that worker with a matching toleration. Remove the taint after verification.','Show matching selector/affinity plus toleration and verify assigned node.'],
['DNS diagnosis',6,'From a Pod resolve a same-namespace Service and a cross-namespace Service. Diagnose a deliberately misspelled service hostname.','Inspect search paths, compare correct FQDN with IP connectivity, and avoid editing CoreDNS for a nonexistent name.'],
['Ingress',7,'Using an installed Ingress controller, expose a Service at app.example.test with Prefix path /.','Use the installed ingressClassName, check backend port and verify a Host-header request.'],
['Gateway repair',7,'Create an HTTPRoute with a nonexistent backend. Diagnose the unresolved reference, fix it and verify HTTP traffic through a Gateway.','Inspect parent conditions and backendRefs; success includes traffic through a programmed Gateway.'],
['Storage repair',10,'Create a PVC referencing a nonexistent class. Diagnose the failure and create a corrected claim with a working class and consumer.','Inspect PVC events and available classes. Verify Bound, Ready and actual write/read. Cleanup must respect reclaim policy.'],
['Snapshot recovery',12,'On a disposable single-member kubeadm lab take a snapshot, add a marker, restore into a new data directory, reconnect etcd and recover the API.','Validate snapshot, follow member/version-specific restore guidance, relocate manifests outside watch directory, update hostPath and show marker absent after restore.'],
['Control plane recovery',10,'In a disposable kubeadm VM introduce a reversible bad kube-apiserver flag. Diagnose with CRI logs and repair the manifest.','Back up outside manifest directory. Verify API readiness, system Pods and workload reconciliation.'],
['Resource diagnosis',8,'Inspect node and Pod metrics where available. Diagnose one Pending Pod with an impossible CPU request; fix its request without adding nodes.','Use FailedScheduling evidence and node allocatable values, then demonstrate a Ready Pod.']
];
videos.storage={id:'0swOh5C3OVM',title:'Kubernetes Volumes: PV, PVC & StorageClass',author:'TechWorld with Nana',note:'2020 conceptual introduction. Use the current CSI and storage documentation for driver setup and access-mode details.'};
for (const l of lessons) { if(l.domain==='storage') l.video='storage'; }
