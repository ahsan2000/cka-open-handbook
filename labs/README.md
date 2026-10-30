# CKA Open Handbook — downloadable practice pack

Original labs by Ahsan Nawaz. CC BY 4.0. Third-party software retains its own licenses.
These are training exercises, not recalled exam questions.

## Environment matrix

- Labs 01, 02, 07, 09, 10: local kind or another disposable Kubernetes cluster.
- Lab 03: cluster with a CNI that actually enforces NetworkPolicy. The default kind CNI does not.
- Lab 04: **single-node** disposable cluster only. Run separately from the three-node kind setup, or adapt to CSI/local PV topology. hostPath data is tied to a node.
- Lab 05: Gateway API CRDs, a compatible controller and an installed GatewayClass.
- Lab 06: a supported Ingress controller and IngressClass.
- Lab 08: metrics-server for HPA metrics; quotas can reject later experiments.
- kubeadm, systemd, static control-plane manifests, upgrade and etcd recovery: disposable Linux VMs, SSH and sudo, not this workload pack.

Use the official version-specific installation guides linked in the website. Hardware, network and image-download access are prerequisites. Cloud VMs are optional and can cost money; the guide does not need a paid course.

## Start

Install a supported container runtime, kubectl and kind from official instructions.

    kind create cluster --name cka --config kind.yaml
    kubectl config use-context kind-cka
    kubectl wait --for=condition=Ready nodes --all --timeout=180s
    kubectl apply -f 01-workload.yaml
    kubectl -n cka-lab rollout status deployment/web --timeout=180s

Inspect each file before applying it. Do not apply the entire directory: some labs are intentionally conditional and require replacing class names. Never use a production context.

## Verify workload and RBAC

    kubectl -n cka-lab get pods,service
    kubectl -n cka-lab run client --rm -it --restart=Never --image=busybox:1.36 -- wget -T 5 -qO- http://web:8080
    kubectl apply -f 02-rbac.yaml
    kubectl auth can-i list pods -n cka-lab --as=system:serviceaccount:cka-lab:reader
    kubectl auth can-i delete pods -n cka-lab --as=system:serviceaccount:cka-lab:reader

Expect HTTP HTML, then yes and no. Impersonation requires admin permission.

## NetworkPolicy positive and negative checks

Only use a compatible enforcing CNI and a fresh lab with no other allow policies.

    kubectl apply -f 03-networkpolicy.yaml
    kubectl -n cka-lab run allowed --labels=access=true --rm -it --restart=Never --image=busybox:1.36 -- wget -T 5 -qO- http://web:8080
    kubectl -n cka-lab run denied --rm -it --restart=Never --image=busybox:1.36 -- wget -T 5 -qO- http://web:8080

The first succeeds, second times out. NetworkPolicy port 80 is the backend Pod port, while Service port 8080 forwards to it. Remove this policy with `kubectl -n cka-lab delete networkpolicy web-only-clients` before unrelated HTTP tests if necessary.

## Storage persistence (single-node lab)

Ensure namespace cka-lab exists. On a separate single-node cluster:

    kubectl apply -f 04-storage-single-node.yaml
    kubectl -n cka-lab wait --for=condition=Ready pod/writer --timeout=120s
    kubectl -n cka-lab exec writer -- sh -c 'echo retained > /data/note.txt'
    kubectl -n cka-lab delete pod writer
    kubectl apply -f 04-storage-single-node.yaml
    kubectl -n cka-lab wait --for=condition=Ready pod/writer --timeout=120s
    kubectl -n cka-lab exec writer -- cat /data/note.txt

Expect retained. Retain preserves the PV backing directory after claim deletion; it does not provide a backup.

## Gateway and Ingress

Replace REPLACE_WITH_INSTALLED_CLASS separately in 05 and 06 with the actual matching class. Apply only after installing the required controller. Inspect status and events. Test:

    curl -H 'Host: web.example.test' http://REACHABLE_CONTROLLER_OR_GATEWAY_ADDRESS/

Replace the address. In a local environment use the implementation's documented port mapping or access method. If policy lab 03 is active, its source selector may block controller-to-backend traffic; remove it or explicitly allow controller traffic for this separate exercise.

## Scheduling

    kubectl get nodes
    kubectl label node WORKER_NAME disk=ssd --overwrite
    kubectl apply -f 07-affinity.yaml
    kubectl -n cka-lab get pod placed -o wide

Replace WORKER_NAME. Pod should run on a matching node. A toleration permits a taint but does not add one.

## CRD versus operator

    kubectl apply -f 09-custom-resource.yaml
    kubectl wait --for=condition=Established crd/studynotes.training.example.com --timeout=60s
    kubectl apply -f 10-studynote.yaml
    kubectl -n cka-lab get studynotes -o yaml
    kubectl explain studynote.spec

The custom resource is stored successfully. No reconciliation occurs because this example deliberately has no controller. Compare with an installed operator and inspect its status/logs using the website module.

## Practice recovery, then explain it

Break a Service selector:

    kubectl -n cka-lab patch service web -p '{"spec":{"selector":{"app":"wrong"}}}'
    kubectl -n cka-lab get endpointslices -l kubernetes.io/service-name=web
    kubectl -n cka-lab get pods --show-labels
    kubectl -n cka-lab patch service web -p '{"spec":{"selector":{"app":"web"}}}'

Repeat the HTTP check. Change an image to a nonexistent tag, inspect events and repair it. Change readiness to /missing, inspect Ready and endpoints, then restore /.

## Cleanup

Inspect reclaim policy and anything you want to keep first. The command below deletes ALL namespaced practice objects and data claims in cka-lab:

    kubectl delete namespace cka-lab

Cluster-scoped CRDs and the Retain PV remain. Deleting a CRD removes all of its instances. Deleting the kind cluster destroys the disposable cluster:

    kind delete cluster --name cka

Only run cleanup when these resources are yours and disposable. Do not automate it against an unknown context.
