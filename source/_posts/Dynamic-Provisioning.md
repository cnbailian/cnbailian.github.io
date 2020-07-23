---
title: Kubernetes 的 Dynamic Provisioning 实现
date: 2020/3/11 00:00:00
---

存储一直是容器运行的关键部分，Kubernetes 为此做了很多努力，从一开始的 Pod Volumes、PV(Persistent Volumes) 与 PVC(Persistent Volume Claim)，到 StorageClass 与 Dynamic Provisioning，再到现在 “out-of-tree” 的 CSI(Container Storage Interface)，Kubernetes 社区一直在演进存储的实现。

前面基础的就不讲了，我们从 StorageClass 与 Dynamic Provisioning 开始了解。  

<!--more-->  



## 关于 StorageClass 与 Dynamic Provisioning

StorageClass 为存储提供了“类”的概念，使得 PVC 可以申请不同类别的 PV，以满足用户不同质量、不同策略要求的存储需求。但仅仅是这样还不够，我们还需要手动去创建存储，创建 PV 并与之绑定。所以 StorageClass 还有一个功能就是**动态卷供应（Dynamic Provisioning）**，通过它，Kubernetes 可以根据用户的需求，自动创建其需要的存储。

### 如何使用

我们需要创建 StorageClass 对象，通过 `provisioner` 属性指定所用的动态供应的种类：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
```

创建好以后，所有指定这个 StorageClass 的 PVC 都会动态分配 PV：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: standard
```

当然，也需要些其他的配置，比如 aws-ebs 需要在启动参数中加入 `--cloud-provider=aws`。Glusterfs 需要在集群节点中预先安装好分布式存储等。具体请参考官方手册或 Google，这里不赘述了。

### External provisioner

官方提供了许多 Provisioner 的实现：AWSElasticBlockStore、AzureFile、Glusterfs [等等](https://kubernetes.io/docs/concepts/storage/storage-classes/#provisioner)，这些都是 “in-tree” 的，所以官方也在实验一些 external provisioner 的实现方式。在 **[kubernetes-incubator/external-storage](https://github.com/kubernetes-incubator/external-storage)** 这个仓库中，就有一些孵化中的项目，不过随着 CSI 的出现，应该已经孵死了。官方也正在将 “in-tree” 的存储实现迁移到 CSI 上。



## 如何实现

我们根据 external-storage 仓库中的项目，简单的分析一下如何自定义一个 Dynamic Provisioner。

其实这个仓库中的项目都很简单，文件没有几个，代码也没有几行。这是因为它们都是基于官方社区的 [library](https://github.com/kubernetes-sigs/sig-storage-lib-external-provisioner#sig-storage-lib-external-provisioner) 实现的，它实现了 `Provisioner Controller` 的整个流程，包括监听、创建 PV 资源等，我们只需要实现 `Provisioner` 接口的两个方法就可以：

```Go
// Provisioner is an interface that creates templates for PersistentVolumes
// and can create the volume as a new resource in the infrastructure provider.
// It can also remove the volume it created from the underlying storage
// provider.
type Provisioner interface {
	// Provision creates a volume i.e. the storage asset and returns a PV object
	// for the volume
	Provision(ProvisionOptions) (*v1.PersistentVolume, error)
	// Delete removes the storage asset that was created by Provision backing the
	// given PV. Does not delete the PV object itself.
	//
	// May return IgnoredError to indicate that the call has been ignored and no
	// action taken.
	Delete(*v1.PersistentVolume) error
}
```

`Provision` 方法需要根据给定的数据，分配存储，响应 PV 对象。`Delete` 方法需要在 PV 删除时，也删除对应存储中的数据。

我们选择仓库中的 nfs 项目来进行详细的分析，它不同于其他 client 类项目，它还维护了一份 nfs server，使得它可以不基于其他外部存储服务。可以在 `main` 函数中看到，通过 `runServer flag` 判断是否需要启动服务，默认为 `true`：

```go
	if *runServer {
		......
		go func() {
			for {
				// This blocks until server exits (presumably due to an error)
				err = server.Run(ganeshaLog, ganeshaPid, ganeshaConfig)
				if err != nil {
					glog.Errorf("NFS server Exited Unexpectedly with err: %v", err)
				}

				// take a moment before trying to restart
				time.Sleep(time.Second)
			}
		}()
		// Wait for NFS server to come up before continuing provisioner process
		time.Sleep(5 * time.Second)
	}
```

随后通过 `Provisioner Controller` 的 `Run` 方法启动 Provisioner 服务：

```go
	// Create the provisioner: it implements the Provisioner interface expected by
	// the controller
	nfsProvisioner := vol.NewNFSProvisioner(exportDir, clientset, outOfCluster, *useGanesha, ganeshaConfig, *enableXfsQuota, *serverHostname, *maxExports, *exportSubnet)

	// Start the provision controller which will dynamically provision NFS PVs
	pc := controller.NewProvisionController(
		clientset,
		*provisioner,
		nfsProvisioner,
		serverVersion.GitVersion,
	)

	pc.Run(wait.NeverStop)
```

`NewNFSProvisioner` 返回的是实现了 `Provisioner` 接口的结构体：

```go
type nfsProvisioner struct {
  ......
}

var _ controller.Provisioner = &nfsProvisioner{}
```

接下来就看下如何实现的 `Provision` 方法：

```go
// options 里包含创建 pv 的数据，pvName、pvc、sc、selectedNode 等
func (p *nfsProvisioner) Provision(options controller.ProvisionOptions) (*v1.PersistentVolume, error) {
  // 在这里进行验证，创建目录等操作
	volume, err := p.createVolume(options)
	if err != nil {
		return nil, err
	}

	annotations := make(map[string]string)
  ......

	pv := &v1.PersistentVolume{
		ObjectMeta: metav1.ObjectMeta{
			Name:        options.PVName,
			Labels:      map[string]string{},
			Annotations: annotations,
		},
		Spec: v1.PersistentVolumeSpec{
			PersistentVolumeReclaimPolicy: *options.StorageClass.ReclaimPolicy,
			AccessModes:                   options.PVC.Spec.AccessModes,
			Capacity: v1.ResourceList{
				v1.ResourceName(v1.ResourceStorage): options.PVC.Spec.Resources.Requests[v1.ResourceName(v1.ResourceStorage)],
			},
			PersistentVolumeSource: v1.PersistentVolumeSource{
				NFS: &v1.NFSVolumeSource{
					Server:   volume.server,
					Path:     volume.path,
					ReadOnly: false,
				},
			},
			MountOptions: options.StorageClass.MountOptions,
		},
	}

	return pv, nil
}

func (p *nfsProvisioner) createVolume(options controller.ProvisionOptions) (volume, error) {
	// 在这里验证剩余磁盘空间是否超出请求大小，只计算当前剩余
  gid, rootSquash, mountOptions, err := p.validateOptions(options)
	if err != nil {
		return volume{}, fmt.Errorf("error validating options for volume: %v", err)
	}
  ......
  // 根据 pvc 创建目录
	path := path.Join(p.exportDir, options.PVName)

	err = p.createDirectory(options.PVName, gid)
	if err != nil {
		return volume{}, fmt.Errorf("error creating directory for volume: %v", err)
	}
  ......
}


func (p *nfsProvisioner) validateOptions(options controller.ProvisionOptions) (string, bool, string, error) {
  ......
	var stat syscall.Statfs_t
	if err := syscall.Statfs(p.exportDir, &stat); err != nil {
		return "", false, "", fmt.Errorf("error calling statfs on %v: %v", p.exportDir, err)
	}
	capacity := options.PVC.Spec.Resources.Requests[v1.ResourceName(v1.ResourceStorage)]
	requestBytes := capacity.Value()
	available := int64(stat.Bavail) * int64(stat.Bsize)
	if requestBytes > available {
		return "", false, "", fmt.Errorf("insufficient available space %v bytes to satisfy claim for %v bytes", available, requestBytes)
	}

	return gid, rootSquash, mountOptions, nil
}
```

然后是 `Delete` 方法的实现：

```go
func (p *nfsProvisioner) Delete(volume *v1.PersistentVolume) error {
  ......
  // pv 删除后，删除对应的目录
	err = p.deleteDirectory(volume)
	if err != nil {
		return fmt.Errorf("error deleting volume's backing path: %v", err)
	}
  ......
	return nil
}
```

这里只是简单的讲解下 `Provisioner` 的实现，省略了其他一些比如 `xfs quota` 等操作，有兴趣的可以去项目中看一下。顺便提一下，这个项目虽然部署了 nfs server，但没有部署成分布式存储，局限性很大，毕竟只是实验中的项目，生产环境慎用。



## 后记

碰巧在项目中接触到了 nfs 这个 Provisioner，并且经过测试及源码分析验证了这个项目不可用。经过查阅学习之后写下了这篇文章，算是为以后学习 CSI 作准备吧。

