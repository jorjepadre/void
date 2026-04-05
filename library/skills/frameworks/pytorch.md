---
id: frameworks/pytorch
name: PyTorch Patterns
version: "1.0.0"
description: PyTorch patterns for model authoring, training loops, and deployment.
language: python
tags: [pytorch, ml, deep-learning, python]
depends_on: [languages/python]
capabilities: [model-authoring, training, inference]
parameters: []
tools: []
constraints: []
---

# PyTorch Patterns

Authoring, training, and serving PyTorch models with practical conventions.

## Model Authoring

- Subclass `nn.Module`; implement `__init__` and `forward` only.
- Keep modules composable — small blocks that plug together.
- Use `nn.Sequential` for linear stacks; classes for branching logic.
- Register buffers (`register_buffer`) for non-parameter state that should move with the module.

```python
class ResidualBlock(nn.Module):
    def __init__(self, dim: int):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(dim, dim), nn.ReLU(), nn.Linear(dim, dim))
    def forward(self, x): return x + self.net(x)
```

## Data Pipeline

- `Dataset` for random-access data; `IterableDataset` for streaming.
- `DataLoader` with `num_workers > 0` for parallel loading; `pin_memory=True` with GPU.
- Augmentations inside `Dataset.__getitem__` so they run in worker processes.

## Training Loop

- Zero gradients, forward, loss, backward, step. In that order.
- `torch.autocast` + `GradScaler` for mixed precision.
- Log train/val loss, learning rate, and at least one diagnostic metric per step.
- Save checkpoints with model state, optimizer state, scheduler, and step count.

```python
for x, y in loader:
    x, y = x.to(device), y.to(device)
    with torch.autocast(device_type=device):
        pred = model(x)
        loss = loss_fn(pred, y)
    opt.zero_grad(set_to_none=True)
    scaler.scale(loss).backward()
    scaler.step(opt); scaler.update()
```

## Device and Memory

- Move model and inputs to the same device; fail loudly when they diverge.
- `torch.cuda.empty_cache()` does not free memory held by live tensors.
- Use `torch.no_grad()` or `inference_mode()` for eval — saves memory and speeds up.

## Reproducibility

- Seed `torch`, `numpy`, `random`, and set `torch.backends.cudnn.deterministic = True` when bit-exact results matter.
- Log versions and hardware alongside experiment metadata.

## Evaluation

- Separate eval loops with `model.eval()` and `torch.inference_mode()`.
- Track metrics per epoch; early stop on a validation criterion.
- Never peek at test set during tuning.

## Deployment

- `torch.jit.script`/`trace` or `torch.export` for compiled graphs.
- ONNX export for cross-runtime; validate numerics after export.
- TorchServe, Triton, or a custom FastAPI wrapper for inference.

## Distributed Training

- `DistributedDataParallel` (DDP) over `DataParallel`.
- One process per GPU; `torchrun` as the launcher.
- Use `torch.distributed.barrier()` judiciously; avoid redundant syncs.

## Common Pitfalls

- Forgetting `.to(device)` on either model or data.
- Accumulating gradients across batches unintentionally (missing `zero_grad`).
- `.item()` in tight loops blocks the GPU — aggregate first, extract at the end.
- Creating tensors on CPU inside the training loop — allocate once or on the right device.
