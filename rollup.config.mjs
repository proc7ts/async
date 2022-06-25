import { ProjectConfig } from '@run-z/project-config';
import { ProjectRollup } from '@run-z/project-config/rollup';

const project = new ProjectConfig();

export default new ProjectRollup(project).build();
