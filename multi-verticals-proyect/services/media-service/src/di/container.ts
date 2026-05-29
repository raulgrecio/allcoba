import { RunImagePipelineUseCase } from '#application/use-cases/run-image-pipeline.use-case.js';
import { ImagePipelineAdapter } from '#infrastructure/adapters/images/image-pipeline.adapter.js';

export class Container {
  private static instance: Container;

  public readonly imagePipeline = new ImagePipelineAdapter();
  public readonly runImagePipelineUseCase = new RunImagePipelineUseCase(this.imagePipeline);

  private constructor() {}

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}
