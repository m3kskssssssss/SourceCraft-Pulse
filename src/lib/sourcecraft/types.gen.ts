// Автогенерировано: pnpm gen:api
// Не редактируйте вручную.

export type paths = {
    "/{org_slug}/{repo_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `DELETE /repos/{org_slug}/{repo_slug}` instead
         */
        delete: operations["DeleteRepositoryDeprecated"];
        options?: never;
        head?: never;
        /**
         * Update Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `PATCH /repos/{org_slug}/{repo_slug}` instead
         */
        patch: operations["UpdateRepositoryDeprecated"];
        trace?: never;
    };
    "/{org_slug}/{repo_slug}/ci_workflows/{workflow_name}/trigger": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Run Workflow in Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `POST /repos/{org_slug}/{repo_slug}/cicd/runs` instead
         */
        post: operations["RunWorkflow"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{org_slug}/{repo_slug}/cicd/artifacts/{run_slug}/{workflow_slug}/{task_slug}/{cube_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Artifacts from a CI Run
         * @deprecated
         * @description Endpoint is deprecated, please use `GET /repos/{org_slug}/{repo_slug}/cicd/artifacts/{run_slug}/{workflow_slug}/{task_slug}/{cube_slug}` instead
         */
        get: operations["GetCubeArtifactsDeprecated"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{org_slug}/{repo_slug}/cicd/logs/{run_slug}/{workflow_slug}/{task_slug}/{cube_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Logs from a Running CI Cube in Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `GET /repos/{org_slug}/{repo_slug}/cicd/logs/{run_slug}/{workflow_slug}/{task_slug}/{cube_slug}` instead
         */
        get: operations["GetCubeLogsDeprecated"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{org_slug}/{repo_slug}/cicd/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List CI Runs in Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `GET /repos/{org_slug}/{repo_slug}/cicd/runs` instead
         */
        get: operations["ListRunsDeprecated"];
        put?: never;
        /**
         * Run Workflows in Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `POST /repos/{org_slug}/{repo_slug}/cicd/runs` instead
         */
        post: operations["RunWorkflowsDeprecated"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{org_slug}/{repo_slug}/cicd/runs/{run_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get CI Run in Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `GET /repos/{org_slug}/{repo_slug}/cicd/runs/{run_slug}` instead
         */
        get: operations["GetRunDeprecated"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{org_slug}/{repo_slug}/cicd/runs/{run_slug}/{workflow_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Running CI Workflow in Repository
         * @deprecated
         * @description Endpoint is deprecated, please use `GET /repos/{org_slug}/{repo_slug}/cicd/runs/{run_slug}/{workflow_slug}` instead
         */
        get: operations["GetWorkflowDeprecated"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issue_comments/id:{issue_comment_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Comment */
        get: operations["GetIssueComment"];
        put?: never;
        post?: never;
        /**
         * Delete Comment
         * @description Permanently deletes a comment from an issue. This action cannot be undone.
         */
        delete: operations["DeleteIssueComment"];
        options?: never;
        head?: never;
        /**
         * Update Comment
         * @description Update a comment
         */
        patch: operations["UpdateIssueComment"];
        trace?: never;
    };
    "/issue_comments/id:{issue_comment_id}/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List attachments
         * @description Retrieves all attachments from an issue
         */
        get: operations["ListIssueCommentAttachments"];
        put?: never;
        /**
         * Upload attachment
         * @description Uploads attachment to an issue
         */
        post: operations["UploadIssueCommentAttachment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issue_comments/id:{issue_comment_id}/attachments/{attachment_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get attachment
         * @description Gets attachment details and download URL
         */
        get: operations["GetIssueCommentAttachment"];
        put?: never;
        post?: never;
        /**
         * Remove attachment
         * @description Permanently removes an attachment from a comment. The file will be deleted and cannot be reused.
         */
        delete: operations["DeleteIssueCommentAttachment"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issue_comments/id:{issue_comment_id}/reactions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add Reaction
         * @description Adds a reaction to an issue comment
         */
        post: operations["AddReaction"];
        /**
         * Remove Reaction
         * @description Remove a reaction from an issue comment
         */
        delete: operations["RemoveReaction"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issue_links/id:{issue_link_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete Link (By Link ID)
         * @description Removes links between issues by ID
         */
        delete: operations["DeleteIssueLink"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issue_statuses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List system statuses
         * @description Lists Issue Statuses available for any issue
         */
        get: operations["ListIssueStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issues/id:{issue_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Issue (By ID) */
        get: operations["GetIssueByID"];
        put?: never;
        post?: never;
        /** Delete Issue (By Issue ID) */
        delete: operations["DeleteIssueByID"];
        options?: never;
        head?: never;
        /** Update Issue (By Issue ID) */
        patch: operations["UpdateIssueByID"];
        trace?: never;
    };
    "/issues/id:{issue_id}/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List attachments (By Issue ID)
         * @description Retrieves all attachments from an issue
         */
        get: operations["ListIssueAttachmentsByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issues/id:{issue_id}/attachments/{attachment_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get attachment (By Issue ID)
         * @description Gets attachment details and download URL
         */
        get: operations["GetIssueAttachmentByID"];
        put?: never;
        post?: never;
        /**
         * Remove attachment (by Issue ID)
         * @description Permanently removes an attachment from an issue. The file will be deleted and cannot be reused.
         */
        delete: operations["DeleteIssueAttachmentByID"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issues/id:{issue_id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Comments (by ID)
         * @description Retrieves comments for an issue
         */
        get: operations["ListIssueCommentsByID"];
        put?: never;
        /** Create comment (by Issue ID) */
        post: operations["CreateIssueCommentByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issues/id:{issue_id}/issue_links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Issue Links (By Issue ID)
         * @description Retrieves links between this issue and other issues
         */
        get: operations["ListIssueLinksByID"];
        put?: never;
        /**
         * Create Link between Issues (By Issue ID)
         * @description Creates a two-way relation from source issue to target issue of a specific type. Only one link can exist between two given issues.
         */
        post: operations["CreateIssueLinkByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issues/id:{issue_id}/labels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Labels (By Issue ID)
         * @description Retrieves all labels that are linked to the specified issue.
         */
        get: operations["GetLabelsByID"];
        /**
         * Replace Labels (By Issue ID)
         * @description Completely replaces the current set of labels on an issue with the provided set.
         */
        put: operations["ReplaceLabelsByID"];
        /**
         * Add Labels (By Issue ID)
         * @description Associates one or more labels with a specific issue. Returns resulting collection.
         */
        post: operations["AddLabelsByID"];
        /**
         * Remove labels (By Issue ID)
         * @description Removes one or more labels from a specific issue. Returns resulting collection.
         */
        delete: operations["RemoveLabelsByID"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/issues/id:{issue_id}/linked_prs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Linked PRs (By Issue ID)
         * @description Retrieves all pull requests that are linked to the specified issue.
         */
        get: operations["GetLinkedPRsByID"];
        put?: never;
        /**
         * Add linked PRs (By ID)
         * @description Associates one or more pull requests with a specific issue. Returns resulting collection
         */
        post: operations["AddLinkedPRsByID"];
        /**
         * Remove linked PRs (by ID)
         * @description Removes one or more pull requests with a specific issue. Returns resulting collection
         */
        delete: operations["RemoveLinkedPRsByID"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/labels/id:{label_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Label (By Label ID) */
        get: operations["GetLabelByID"];
        put?: never;
        post?: never;
        /** Delete label (By Label ID) */
        delete: operations["DeleteLabelByID"];
        options?: never;
        head?: never;
        /** Update Label (By Label ID) */
        patch: operations["UpdateLabelByID"];
        trace?: never;
    };
    "/me/issues": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * My Issues
         * @description Returns a list of issues that are either assigned to or created by the currently authenticated user.
         */
        get: operations["ListIssuesAssignedToAuthenticatedUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/pulls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * My Pull Requests
         * @description Returns a list of pull requests related to the currently authenticated user.
         */
        get: operations["ListMyPullRequests"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/repository-rating-reactions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the current user's repository rating reactions, ordered by update time descending. */
        get: operations["ListRatingReactions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/milestones/id:{milestone_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a Milestone (By ID) */
        get: operations["GetMilestoneByID"];
        put?: never;
        post?: never;
        /** Delete a Milestone (By ID) */
        delete: operations["DeleteMilestoneByID"];
        options?: never;
        head?: never;
        /** Update a Milestone (By ID) */
        patch: operations["UpdateMilestoneByID"];
        trace?: never;
    };
    "/operations/create-invites/id:{operation_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get invitation creation operation status (By Operation ID) */
        get: operations["GetOrganizationInvitesOperationByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/operations/merge/id:{operation_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get pull request merge operation status (By Operation ID) */
        get: operations["GetPullRequestMergeOperationByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/operations/secrets/id:{operation_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get secret operation status (By Operation ID) */
        get: operations["GetSecretOperationByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Organization */
        get: operations["GetOrganization"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/code-assist-workplaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get code assist workplaces information for an organization */
        get: operations["GetCodeAssistWorkplaces"];
        /** Set the number of code assist workplaces for an organization */
        put: operations["SetCodeAssistWorkplaces"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/code-assist-workplaces/occupied": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List users occupying code assist workplaces in an organization */
        get: operations["ListOccupiedCodeAssistWorkplaces"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/code-assist-workplaces/occupy-bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Occupy code assist workplaces for multiple users in bulk */
        post: operations["OccupyCodeAssistWorkplacesBulk"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/code-assist-workplaces/release-bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Release code assist workplaces for multiple users in bulk */
        post: operations["ReleaseCodeAssistWorkplacesBulk"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/code-assist-workplaces/transfer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transfer a code assist workplace from one user to another */
        post: operations["TransferCodeAssistWorkplace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/invites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Organization Invitations */
        get: operations["ListOrganizationInvites"];
        put?: never;
        /**
         * Create Organization Invitations
         * @description Creates invitations asynchronously. Poll operation status at the returned status_url.
         */
        post: operations["CreateOrganizationInvites"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/invites/{invite_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Organization Invite */
        get: operations["GetOrganizationInvite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/personal-quotas/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List personal quotas for an organization for the currently authenticated user */
        get: operations["ListMyPersonalQuotas"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Organization Projects */
        get: operations["ListOrganizationProjects"];
        put?: never;
        /** Create Project in Organization */
        post: operations["CreateProject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/projects/{project_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Project */
        get: operations["GetProject"];
        put?: never;
        post?: never;
        /**
         * Delete Project
         * @description Repositories are not deleted; they are removed from the project.
         */
        delete: operations["DeleteProject"];
        options?: never;
        head?: never;
        /** Update Project */
        patch: operations["UpdateProject"];
        trace?: never;
    };
    "/orgs/{org_slug}/projects/{project_slug}/repos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Project Repositories */
        get: operations["ListProjectRepositories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/projects/{project_slug}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Project Roles */
        get: operations["ListProjectRoles"];
        put?: never;
        /** Add Project Roles */
        post: operations["AddProjectRoles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/projects/{project_slug}/roles/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Remove Project Roles */
        post: operations["RemoveProjectRoles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/quotas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List quotas for an organization */
        get: operations["ListQuotas"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/repos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Organization Repositories */
        get: operations["ListOrganizationRepositories"];
        put?: never;
        /** Create Repository in Organization */
        post: operations["CreateRepository"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Organization Roles
         * @description Requires IAM-token for authorization.
         */
        get: operations["ListOrganizationRoles"];
        put?: never;
        /**
         * Add Organization Roles
         * @description Requires IAM-token for authorization.
         */
        post: operations["AddOrganizationRoles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/roles/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Remove Organization Roles
         * @description Requires IAM-token for authorization.
         */
        post: operations["RemoveOrganizationRoles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/stats/neurocredits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Organization Neurocredits Usage */
        get: operations["GetOrganizationNeurocreditsUsage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/{org_slug}/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Teams */
        get: operations["ListTeams"];
        put?: never;
        /** Create Team */
        post: operations["CreateTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Organization (By ID) */
        get: operations["GetOrganizationByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/code-assist-workplaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get code assist workplaces information for an organization (By ID) */
        get: operations["GetCodeAssistWorkplacesByID"];
        /** Set the number of code assist workplaces for an organization (By ID) */
        put: operations["SetCodeAssistWorkplacesByID"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/code-assist-workplaces/occupied": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List users occupying code assist workplaces in an organization (By ID) */
        get: operations["ListOccupiedCodeAssistWorkplacesByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/code-assist-workplaces/occupy-bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Occupy code assist workplaces for multiple users in bulk (By ID) */
        post: operations["OccupyCodeAssistWorkplacesBulkByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/code-assist-workplaces/release-bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Release code assist workplaces for multiple users in bulk (By ID) */
        post: operations["ReleaseCodeAssistWorkplacesBulkByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/code-assist-workplaces/transfer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transfer a code assist workplace from one user to another (By ID) */
        post: operations["TransferCodeAssistWorkplaceByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/invites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Organization Invitations (By Organization ID) */
        get: operations["ListOrganizationInvitesByID"];
        put?: never;
        /**
         * Create Organization Invitations (By Organization ID)
         * @description Creates invitations asynchronously. Poll operation status at the returned status_url.
         */
        post: operations["CreateOrganizationInvitesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/invites/{invite_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Organization Invite (By ID) */
        get: operations["GetOrganizationInviteByOrgID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/personal-quotas/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List personal quotas for an organization for the currently authenticated user (By ID) */
        get: operations["ListMyPersonalQuotasByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Organization Projects (By Organization ID) */
        get: operations["ListOrganizationProjectsByID"];
        put?: never;
        /** Create Project in Organization (By Organization ID) */
        post: operations["CreateProjectByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/quotas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List quotas for an organization (By ID) */
        get: operations["ListQuotasByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/repos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Organization Repositories (By Organization ID) */
        get: operations["ListOrganizationRepositoriesByID"];
        put?: never;
        /** Create Repository in Organization (By Organization ID) */
        post: operations["CreateRepositoryByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Organization Roles (By ID)
         * @description Requires IAM-token for authorization.
         */
        get: operations["ListOrganizationRolesByID"];
        put?: never;
        /**
         * Add Organization Roles (By ID)
         * @description Requires IAM-token for authorization.
         */
        post: operations["AddOrganizationRolesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/roles/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Remove Organization Roles (By ID)
         * @description Requires IAM-token for authorization.
         */
        post: operations["RemoveOrganizationRolesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/stats/neurocredits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Organization Neurocredits Usage (By ID) */
        get: operations["GetOrganizationNeurocreditsUsageByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/orgs/id:{org_id}/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Teams (By Organization ID) */
        get: operations["ListTeamsByID"];
        put?: never;
        /** Create Team (By Organization ID) */
        post: operations["CreateTeamByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/projects/id:{project_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Project (By ID) */
        get: operations["GetProjectByID"];
        put?: never;
        post?: never;
        /**
         * Delete Project (By Project ID)
         * @description Repositories are not deleted; they are removed from the project.
         */
        delete: operations["DeleteProjectByID"];
        options?: never;
        head?: never;
        /** Update Project (By Project ID) */
        patch: operations["UpdateProjectByID"];
        trace?: never;
    };
    "/projects/id:{project_id}/repos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Project Repositories (By Project ID) */
        get: operations["ListProjectRepositoriesByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/projects/id:{project_id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Project Roles (By ID) */
        get: operations["ListProjectRolesByID"];
        put?: never;
        /** Add Project Roles (By ID) */
        post: operations["AddProjectRolesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/projects/id:{project_id}/roles/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Remove Project Roles (By ID) */
        post: operations["RemoveProjectRolesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pull_comments/id:{pull_request_comment_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Comment */
        get: operations["GetPullRequestComment"];
        put?: never;
        post?: never;
        /**
         * Delete Comment
         * @description Permanently deletes a pull request comment. This action cannot be undone.
         */
        delete: operations["DeletePullRequestComment"];
        options?: never;
        head?: never;
        /**
         * Update Comment
         * @description Updates a pull request comment. Supports updating the comment body,
         *     resolution state, and publishing draft comments.
         */
        patch: operations["UpdatePullRequestComment"];
        trace?: never;
    };
    "/pulls/id:{pull_request_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get PullRequest (By ID) */
        get: operations["GetPullRequestByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update PullRequest (By ID) */
        patch: operations["UpdatePullRequestByID"];
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Comments (by ID) */
        get: operations["ListPullRequestCommentsByID"];
        put?: never;
        /** Create comment (by PullRequest ID) */
        post: operations["CreatePullRequestCommentByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/comments/publish-drafts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Publish Drafts (by ID) */
        post: operations["PublishPullRequestCommentsDraftsByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Set Decision (By ID) */
        post: operations["SetDecisionByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/discard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Discard PullRequest (By ID) */
        post: operations["DiscardPullRequestByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Draft PullRequest (By ID) */
        post: operations["DraftPullRequestByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Pull Request Files (By ID)
         * @description Returns the list of files changed in a pull request with diff patches.
         */
        get: operations["ListPullRequestFilesByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/labels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Labels (By Pull Request ID)
         * @description Retrieves all labels that are linked to the specified pull request.
         */
        get: operations["GetPullRequestLabelsByID"];
        /**
         * Replace Labels (By Pull Request ID)
         * @description Completely replaces the current set of labels on a pull request with the provided set.
         */
        put: operations["ReplacePullRequestLabelsByID"];
        /**
         * Add Labels (By Pull Request ID)
         * @description Associates one or more labels with a specific pull request. Returns resulting collection.
         */
        post: operations["AddPullRequestLabelsByID"];
        /**
         * Remove Labels (By Pull Request ID)
         * @description Removes one or more labels from a specific pull request. Returns resulting collection.
         */
        delete: operations["RemovePullRequestLabelsByID"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Merge PullRequest (By ID)
         * @description Merges a pull request asynchronously by ID. Poll operation status at the returned status_url.
         */
        post: operations["MergePullRequestByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/merge-checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Merge Checks (By ID)
         * @description Returns comprehensive information about merge requirements:
         *     - Code review status and approval rules
         *     - Merge conflicts detection
         *     - CI workflow execution status
         *     - Configuration validation results
         */
        get: operations["GetMergeChecksByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Publish PullRequest (By ID) */
        post: operations["PublishPullRequestByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reopen PullRequest (By ID) */
        post: operations["ReopenPullRequestByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/reviewers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Reviewers (By ID) */
        get: operations["ListReviewersByID"];
        put?: never;
        /** Update Reviewers (By ID) */
        post: operations["UpdateReviewersByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pulls/id:{pull_request_id}/reviewers/auto": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Automatically assign reviewers to meet review requirements (By ID) */
        post: operations["AutoAssignByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/releases/id:{release_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Release (By ID) */
        get: operations["GetByID"];
        put?: never;
        post?: never;
        /** Delete Release (By ID) */
        delete: operations["DeleteByID"];
        options?: never;
        head?: never;
        /**
         * Update Release (By ID)
         * @description Can update title and release notes. For status updates, see 'Publish Release' and
         *     'Discard Release'
         */
        patch: operations["UpdateByID"];
        trace?: never;
    };
    "/releases/id:{release_id}/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload Attachment As Release Asset (By Release ID)
         * @description Uploads attachment to a release and adds it as an asset
         */
        post: operations["AddReleaseAssetAttachmentByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/releases/id:{release_id}/discard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Discard Release (By ID)
         * @description Only 'published' releases may be discarded, drafts can only be deleted or published.
         *     Contrary to deleted releases, discarded releases are still visible to maintainers.
         */
        post: operations["DiscardByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/releases/id:{release_id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publish Release (By ID)
         * @description Only 'draft' releases may be published
         */
        post: operations["PublishByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Discover All Public Repositories
         * @description Lists repositories that are public and belong to a public organization and,
         *     when present, a public project. Deleted resources are excluded.
         *     Repositories are ordered by rating descending unless sort_by is specified.
         *     Pagination does not provide a snapshot: changes to visibility or deletion
         *     can affect subsequent pages. When sorting by rating, rating changes can
         *     cause repositories to be skipped or returned more than once.
         */
        get: operations["DiscoverRepositories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Repository */
        get: operations["GetRepository"];
        put?: never;
        post?: never;
        /** Delete Repository */
        delete: operations["DeleteRepository"];
        options?: never;
        head?: never;
        /** Update Repository */
        patch: operations["UpdateRepository"];
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/branches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Branches */
        get: operations["ListBranches"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/cicd/artifacts/{run_slug}/{workflow_slug}/{task_slug}/{cube_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Artifacts from a CI Run */
        get: operations["GetCubeArtifacts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/cicd/logs/{run_slug}/{workflow_slug}/{task_slug}/{cube_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Logs from a Running CI Cube in Repository */
        get: operations["GetCubeLogs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/cicd/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List CI Runs in Repository */
        get: operations["ListRuns"];
        put?: never;
        /** Run Workflows in Repository */
        post: operations["RunWorkflows"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/cicd/runs/{run_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get CI Run in Repository */
        get: operations["GetRun"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/cicd/runs/{run_slug}/{workflow_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Running CI Workflow in Repository */
        get: operations["GetWorkflow"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List repository contributors. */
        get: operations["ListContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/fork": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Fork Repository */
        post: operations["ForkRepository"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Issues */
        get: operations["ListRepositoryIssues"];
        put?: never;
        /** Create Issue in Repository */
        post: operations["CreateIssue"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues/{issue_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Issue */
        get: operations["GetIssue"];
        put?: never;
        post?: never;
        /** Delete Issue */
        delete: operations["DeleteIssue"];
        options?: never;
        head?: never;
        /** Update Issue */
        patch: operations["UpdateIssue"];
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues/{issue_slug}/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List attachments
         * @description Retrieves all attachments from an issue
         */
        get: operations["ListIssueAttachments"];
        put?: never;
        /**
         * Upload attachment
         * @description Uploads attachment to an issue
         */
        post: operations["UploadIssueAttachment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues/{issue_slug}/attachments/{attachment_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get attachment
         * @description Gets attachment details and download URL
         */
        get: operations["GetIssueAttachment"];
        put?: never;
        post?: never;
        /**
         * Remove attachment
         * @description Permanently removes an attachment from an issue. The file will be deleted and cannot be reused.
         */
        delete: operations["DeleteIssueAttachment"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues/{issue_slug}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Comments
         * @description Retrieves comments for an issue
         */
        get: operations["ListIssueComments"];
        put?: never;
        /** Create comment */
        post: operations["CreateIssueComment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues/{issue_slug}/issue_links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Issue Links
         * @description Retrieves links between this issue and other issues
         */
        get: operations["ListIssueLinks"];
        put?: never;
        /**
         * Create Link between Issues
         * @description Creates a two-way relation from source issue to target issue of a specific type. Only one link can exist between two given issues.
         */
        post: operations["CreateIssueLink"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues/{issue_slug}/labels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Labels
         * @description Retrieves all labels that are linked to the specified issue.
         */
        get: operations["GetLabels"];
        /**
         * Replace Labels
         * @description Completely replaces the current set of labels on an issue with the provided set.
         */
        put: operations["ReplaceLabels"];
        /**
         * Add Labels
         * @description Associates one or more labels with a specific issue. Returns resulting collection.
         */
        post: operations["AddLabels"];
        /**
         * Remove labels
         * @description Removes one or more labels from a specific issue. Returns resulting collection.
         */
        delete: operations["RemoveLabels"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/issues/{issue_slug}/linked_prs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Linked PRs
         * @description Retrieves all pull requests that are linked to the specified issue.
         */
        get: operations["GetLinkedPRs"];
        put?: never;
        /**
         * Add Linked PRs
         * @description Associates one or more pull requests with a specific issue. Returns resulting collection
         */
        post: operations["AddLinkedPRs"];
        /**
         * Remove linked PRs
         * @description Removes one or more pull requests with a specific issue. Returns resulting collection
         */
        delete: operations["RemoveLinkedPRs"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/labels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List labels */
        get: operations["ListLabelsForRepository"];
        put?: never;
        /** Create Label */
        post: operations["CreateLabel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/labels/{label_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Label (By Slug) */
        get: operations["GetLabel"];
        put?: never;
        post?: never;
        /** Delete label (By Slug) */
        delete: operations["DeleteLabel"];
        options?: never;
        head?: never;
        /** Update Label (By Slug) */
        patch: operations["UpdateLabel"];
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/milestones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Milestones */
        get: operations["ListMilestonesForRepository"];
        put?: never;
        /** Create a Milestone */
        post: operations["CreateMilestone"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/milestones/{milestone_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a Milestone (By Slug) */
        get: operations["GetMilestone"];
        put?: never;
        post?: never;
        /** Delete a Milestone (By Slug) */
        delete: operations["DeleteMilestone"];
        options?: never;
        head?: never;
        /** Update a Milestone (By Slug) */
        patch: operations["UpdateMilestone"];
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Repository Pull Requests
         * @description Retrieves all pull requests from an repository
         */
        get: operations["ListRepositoryPullRequests"];
        put?: never;
        /** Create PullRequest in Repository */
        post: operations["CreatePullRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get PullRequest */
        get: operations["GetPullRequest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update PullRequest */
        patch: operations["UpdatePullRequest"];
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Comments */
        get: operations["ListPullRequestComments"];
        put?: never;
        /** Create comment */
        post: operations["CreatePullRequestComment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/comments/publish-drafts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publish Drafts
         * @description Publishes all draft (unpublished) comments authored by the current user
         *     on a pull request. Returns the number of comments published.
         */
        post: operations["PublishPullRequestCommentsDrafts"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Set Decision */
        post: operations["SetDecision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/discard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Discard PullRequest */
        post: operations["DiscardPullRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Draft PullRequest */
        post: operations["DraftPullRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Pull Request Files
         * @description Returns the list of files changed in a pull request with diff patches.
         */
        get: operations["ListPullRequestFiles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/labels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Labels
         * @description Retrieves all labels that are linked to the specified pull request.
         */
        get: operations["GetPullRequestLabels"];
        /**
         * Replace Labels
         * @description Completely replaces the current set of labels on a pull request with the provided set.
         */
        put: operations["ReplacePullRequestLabels"];
        /**
         * Add Labels
         * @description Associates one or more labels with a specific pull request. Returns resulting collection.
         */
        post: operations["AddPullRequestLabels"];
        /**
         * Remove Labels
         * @description Removes one or more labels from a specific pull request. Returns resulting collection.
         */
        delete: operations["RemovePullRequestLabels"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Merge PullRequest
         * @description Merges a pull request asynchronously. Poll operation status at the returned status_url.
         */
        post: operations["MergePullRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/merge-checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Merge Checks
         * @description Returns comprehensive information about merge requirements:
         *     - Code review status and approval rules
         *     - Merge conflicts detection
         *     - CI workflow execution status
         *     - Configuration validation results
         */
        get: operations["GetMergeChecks"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Publish PullRequest (change status to open) */
        post: operations["PublishPullRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reopen PullRequest */
        post: operations["ReopenPullRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/reviewers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Reviewers */
        get: operations["ListReviewers"];
        put?: never;
        /** Update Reviewers */
        post: operations["UpdateReviewers"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/pulls/{pull_request_slug}/reviewers/auto": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Automatically assign reviewers to meet review requirements */
        post: operations["AutoAssign"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/rating": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the current user's rating reaction to a repository. */
        get: operations["GetMyRatingReaction"];
        /** Set or remove the current user's rating reaction to a repository. */
        put: operations["RateRepository"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/releases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Releases in Repository */
        get: operations["List"];
        put?: never;
        /** Create Release in Repository */
        post: operations["Create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/releases/generate-notes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Generate Release Notes Preview
         * @description Returns auto-generated markdown release notes for the commit range between
         *     `previous_tag` (or the latest prior release) and `tag`, without creating
         *     a release. Use to preview the body before calling `Create`.
         */
        post: operations["GenerateReleaseNotes"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/releases/latest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Latest Release
         * @description Retrieves a release marked as latest (by default, last published release)
         */
        get: operations["GetLatest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/releases/tag/{release_tag}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Release (By Tag) */
        get: operations["GetByTag"];
        put?: never;
        post?: never;
        /** Delete Release (By Tag) */
        delete: operations["DeleteByTag"];
        options?: never;
        head?: never;
        /**
         * Update Release (By Tag)
         * @description Can update title and release notes. For status updates, see 'Publish Release' and
         *     'Discard Release'
         */
        patch: operations["UpdateByTag"];
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/releases/tag/{release_tag}/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload Attachment As Release Asset (By Release Tag)
         * @description Uploads attachment to a release and adds it as an asset
         */
        post: operations["AddReleaseAssetAttachment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/releases/tag/{release_tag}/discard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Discard Release (By Tag)
         * @description Only 'published' releases may be discarded, drafts can only be deleted or published.
         *     Contrary to deleted releases, discarded releases are still visible to maintainers.
         */
        post: operations["DiscardByTag"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/releases/tag/{release_tag}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publish Release (By Tag)
         * @description Only 'draft' releases may be published
         */
        post: operations["PublishByTag"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Roles */
        get: operations["ListRepoRoles"];
        put?: never;
        /** Add Repository Roles */
        post: operations["AddRepoRoles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/roles/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Remove Repository Roles */
        post: operations["RemoveRepoRoles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/secrets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List secret entries (key-value pairs) */
        get: operations["ListSecrets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/secrets/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Create or update a secret entry
         * @description Creates or updates a secret entry asynchronously. Poll operation status at the returned status_url.
         */
        put: operations["SetSecret"];
        post?: never;
        /**
         * Delete a secret entry
         * @description Deletes a secret entry asynchronously. Poll operation status at the returned status_url.
         */
        delete: operations["DeleteSecret"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Tags */
        get: operations["ListTags"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/{org_slug}/{repo_slug}/trees": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository File Tree */
        get: operations["ListTree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Repository (By ID) */
        get: operations["GetRepositoryByID"];
        put?: never;
        post?: never;
        /** Delete Repository (By Repository ID) */
        delete: operations["DeleteRepositoryByID"];
        options?: never;
        head?: never;
        /** Update Repository (By Repo ID) */
        patch: operations["UpdateRepositoryByID"];
        trace?: never;
    };
    "/repos/id:{repo_id}/branches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Branches (By Repo ID) */
        get: operations["ListBranchesByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/ci_workflows/{workflow_name}/trigger": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Run Workflow in Repository (By Repo ID)
         * @deprecated
         * @description Endpoint is deprecated, please use `POST /repos/id:{repo_id}/cicd/runs` instead
         */
        post: operations["RunWorkflowByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/cicd/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List CI Runs in Repository (By Repo ID) */
        get: operations["ListRunsByID"];
        put?: never;
        /** Run Workflows in Repository (By Repo ID) */
        post: operations["RunWorkflowsByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List repository contributors (By Repo ID). */
        get: operations["ListContributorsByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/fork": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Fork Repository (By ID) */
        post: operations["ForkRepositoryByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/issues": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Issues (By Repo ID) */
        get: operations["ListRepositoryIssuesByID"];
        put?: never;
        /** Create Issue in Repository (By Repo ID) */
        post: operations["CreateIssueByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/labels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List labels (By ID) */
        get: operations["ListLabelsForRepositoryByID"];
        put?: never;
        /** Create Label (By ID) */
        post: operations["CreateLabelByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/milestones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Milestones (By Repo ID) */
        get: operations["ListMilestonesForRepositoryByID"];
        put?: never;
        /** Create a Milestone (By Repo ID) */
        post: operations["CreateMilestoneByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/pulls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Repository Pull Requests (By Repo ID)
         * @description Retrieves all pull requests from an repository
         */
        get: operations["ListRepositoryPullRequestsByID"];
        put?: never;
        /** Create PullRequest in Repository (By Repo ID) */
        post: operations["CreatePullRequestByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/rating": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the current user's rating reaction to a repository identified by UUID. */
        get: operations["GetMyRatingReactionByID"];
        /** Set or remove the current user's rating reaction to a repository identified by UUID. */
        put: operations["RateRepositoryByID"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/releases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Releases in Repository (By Repo ID) */
        get: operations["ListByID"];
        put?: never;
        /** Create Release in Repository (By Repo ID) */
        post: operations["CreateByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/releases/generate-notes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate Release Notes Preview (By Repo ID) */
        post: operations["GenerateReleaseNotesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/releases/latest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Latest Release (By Repo ID)
         * @description Retrieves a release marked as latest (by default, last published release)
         */
        get: operations["GetLatestByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Roles (By ID) */
        get: operations["ListRepoRolesByID"];
        put?: never;
        /** Add Repository Roles (By ID) */
        post: operations["AddRepoRolesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/roles/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Remove Repository Roles (By ID) */
        post: operations["RemoveRepoRolesByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/secrets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List secret entries (By Repo ID) */
        get: operations["ListSecretsByRepoID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/secrets/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Create or update a secret entry (By Repo ID)
         * @description Creates or updates a secret entry asynchronously. Poll operation status at the returned status_url.
         */
        put: operations["SetSecretByRepoID"];
        post?: never;
        /**
         * Delete a secret entry (By Repo ID)
         * @description Deletes a secret entry asynchronously. Poll operation status at the returned status_url.
         */
        delete: operations["DeleteSecretByRepoID"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository Tags (By Repo ID) */
        get: operations["ListTagsByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/repos/id:{repo_id}/trees": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Repository File Tree (By Repo ID) */
        get: operations["ListTreeByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/teams/id:{team_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Team (By ID) */
        get: operations["GetTeamByID"];
        put?: never;
        post?: never;
        /** Delete Team (By ID) */
        delete: operations["DeleteTeamByID"];
        options?: never;
        head?: never;
        /** Update Team (By ID) */
        patch: operations["UpdateTeamByID"];
        trace?: never;
    };
    "/teams/id:{team_id}/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Team Members (By ID) */
        get: operations["ListTeamMembersByID"];
        put?: never;
        /** Update Team Members (By ID) */
        post: operations["UpdateTeamMembersByID"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/user": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get authenticated user profile */
        get: operations["GetMyProfile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/user/code-assist-billing-org": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get CodeAssist billing organization for the authenticated user */
        get: operations["GetMyCodeAssistBillingOrg"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/{user_slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get User Profile */
        get: operations["GetProfile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/{user_slug}/pulls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List User Pull Requests
         * @description Lists pull requests related to a user identified by user slug.
         */
        get: operations["ListUserPullRequests"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/cloud-id:{cloud_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get User Profile (By Cloud ID) */
        get: operations["GetProfileByCloudID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/id:{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get User Profile (By ID) */
        get: operations["GetProfileByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/id:{user_id}/pulls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List User Pull Requests (By User ID)
         * @description Lists pull requests related to a user identified by UUID.
         */
        get: operations["ListUserPullRequestsByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
};
export type webhooks = Record<string, never>;
export type components = {
    schemas: {
        AddOrganizationRolesBody: {
            /** @description List of repository roles that will be set on the organization level. These roles are inherited by all repositories in the organization. */
            repo_subject_roles?: components["schemas"]["SubjectRole"][];
        };
        AddOrganizationRolesResponse: Record<string, never>;
        AddProjectRolesBody: {
            subject_roles?: components["schemas"]["ProjectSubjectRole"][];
        };
        AddProjectRolesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            subject_roles?: components["schemas"]["ProjectSubjectRole"][];
        };
        /** The request body specifies the users and their respective roles to be added to the repository */
        AddRepoRolesBody: {
            subject_roles?: components["schemas"]["SubjectRole"][];
        };
        /** The response returns all roles and users from the repository */
        AddRepoRolesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            subject_roles?: components["schemas"]["SubjectRole"][];
        };
        /** @enum {string} */
        AIProduct: "vscode_plugin" | "jb_plugin" | "cli" | "neuro_features" | "sourcecraft_web_chat";
        Anchor: {
            hunk?: components["schemas"]["Hunk"];
            path?: string;
            position?: components["schemas"]["DiffPos"];
        };
        ApiErrorResponse: {
            /** Optional details. Exact structure depends on error_code */
            details?: unknown;
            /** Error code that can be used for error handling. For example: "ValidationError" */
            error_code?: string;
            /** Human-readable message */
            message?: string;
            /** Request ID */
            request_id?: string;
        };
        /** @enum {string} */
        ArchiveType: "tar_gz" | "zip";
        Artifact: {
            dates?: components["schemas"]["ArtifactDates"];
            /** @description A temporary download URL, will be valid for a short period of time after acquisition. */
            download_url?: string;
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            id?: string;
            /**
             * @description Artifacts do not have a slug as we define it.
             *     Instead they are differentiated by context (workflow, task, cube) and `local_path`.
             *     This is a local path for the artifact as defined in the CI configuration file.
             */
            local_path?: string;
            status?: components["schemas"]["ArtifactStatus"];
        };
        ArtifactDates: {
            /** Format: date-time */
            obtained_at?: string;
            /** Format: date-time */
            registered_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        /** @enum {string} */
        ArtifactStatus: "registered" | "success" | "failed" | "missing";
        Attachment: {
            file_type?: components["schemas"]["FileType"];
            id?: string;
            mime_type?: string;
            name?: string;
            /** Format: int64 */
            size?: string;
        };
        AttachmentDownloadable: {
            file_type?: components["schemas"]["FileType"];
            id?: string;
            mime_type?: string;
            name?: string;
            /** Format: int64 */
            size?: string;
            /** temporary download url */
            url?: string;
        };
        AttachmentEmbedded: {
            id?: string;
        };
        AttachmentsResponse: {
            attachments?: components["schemas"]["Attachment"][];
        };
        AutoAssignBody: {
            silent?: boolean;
        };
        /** AutoAssignResponse contains information about all the reviewers of pull request */
        AutoAssignResponse: {
            reviewers_delta?: components["schemas"]["AutoAssignResponse.ReviewerDelta"][];
        };
        "AutoAssignResponse.ReviewerDelta": {
            action?: components["schemas"]["DeltaAction"];
            user?: components["schemas"]["UserEmbedded"];
        };
        Branch: {
            commit?: components["schemas"]["Commit"];
            name?: string;
        };
        /** CI run completed - emitted when a CI run completes (terminal status) */
        CIRunComplete: {
            header?: components["schemas"]["EventHeader"];
            repository?: components["schemas"]["Repository"];
            run?: components["schemas"]["Run"];
        };
        /**
         * CI workflow execution status
         * @description Different CI workflows may have different corresponding CI runs due to restarts.
         *     To get detailed information about each workflow, use `/{org_slug}/{repo_slug}/cicd/runs/{run_slug}/{workflow_slug}`.
         */
        CIWorkflowCheck: {
            /** Format: date-time */
            created_at?: string;
            disabled?: boolean;
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            run_id?: string;
            /** Run counter */
            run_slug?: string;
            status?: components["schemas"]["Run.Status"];
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            workflow_id?: string;
            /** A name of the workflow as defined in the config */
            workflow_slug?: string;
        };
        /** CI workflow completed - emitted when a single CI workflow completes (terminal status) */
        CIWorkflowComplete: {
            header?: components["schemas"]["EventHeader"];
            repository?: components["schemas"]["Repository"];
            run?: components["schemas"]["RunEmbedded"];
            workflow?: components["schemas"]["Workflow"];
        };
        CloneURL: {
            https?: string;
            ssh?: string;
        };
        CodeArchive: {
            archive_type?: components["schemas"]["ArchiveType"];
            link?: string;
        };
        /** @description CodeAssistWorkplacesInfo contains information about code assist workplaces for an organization. */
        CodeAssistWorkplacesInfo: {
            /** Format: int32 */
            occupied_workplaces?: number;
            /** Format: int32 */
            prepaid_workplaces?: number;
            /** Format: int32 */
            purchased_workplaces?: number;
        };
        /** Code review approval status */
        CodeReviewCheck: {
            disabled?: boolean;
            /**
             * Number of approves required to pass
             * Format: int32
             */
            need_approves?: number;
            /** Individual review rules and their status */
            rules?: components["schemas"]["ReviewRule"][];
            status?: components["schemas"]["MergeChecks.Status"];
            /**
             * Total number of approvals received
             * Format: int32
             */
            total_approves?: number;
        };
        Commit: {
            author?: components["schemas"]["Signature"];
            author_user?: components["schemas"]["UserEmbedded"];
            committer?: components["schemas"]["Signature"];
            committer_user?: components["schemas"]["UserEmbedded"];
            file_changes?: components["schemas"]["CommitFileChanges"];
            hash?: string;
            /** Embedded merge tag (if present) */
            merge_tag?: string;
            message?: string;
            /** Hashes of parent commits */
            parent_hashes?: string[];
            signature_verification?: components["schemas"]["SignatureVerification"];
            /** Hash of the tree object */
            tree_hash?: string;
        };
        CommitFileChanges: {
            /**
             * @description Files that were added in this commit.
             *     Limited to 1000 files maximum. Empty list means no files were added.
             */
            added?: string[];
            /**
             * @description Files that were modified in this commit.
             *     Limited to 1000 files maximum. Empty list means no files were modified.
             */
            modified?: string[];
            /**
             * @description Files that were removed in this commit.
             *     Limited to 1000 files maximum. Empty list means no files were removed.
             */
            removed?: string[];
        };
        /** Configuration file validation status */
        ConfigValidationCheck: {
            /** Format: date-time */
            created_at?: string;
            /** Error message if validation failed */
            error_message?: string;
            /** Path to the configuration file being validated */
            file_path?: string;
            status?: components["schemas"]["MergeChecks.Status"];
        };
        Conflict: {
            /** Type of conflict (e.g., "content", "delete/modify") */
            conflict_type?: string;
            /** Human-readable conflict description */
            message?: string;
            /** File path where conflict occurred */
            path?: string;
        };
        /** Merge conflicts detection status */
        ConflictsCheck: {
            /** List of detected conflicts */
            conflicts?: components["schemas"]["Conflict"][];
            /** Format: date-time */
            created_at?: string;
            /** Error message if conflict detection failed */
            error?: string;
            status?: components["schemas"]["MergeChecks.Status"];
        };
        CreateIssueBody: {
            assignee_id?: string;
            /**
             * User-defined deadline for the issue
             * Format: date-time
             */
            deadline?: string;
            /** Issue description (up to 64Kb) */
            description?: string;
            /** IDs of labels from this repository which are to be linked to the issue. Cannot be used with label_slugs */
            label_ids?: string[];
            /** Slugs of labels from this repository which are to be linked to the issue. Cannot be used with label_ids */
            label_slugs?: string[];
            /** IDs of PRs from this repository which are to be linked to the issue. Cannot be used with linked_pr_slugs */
            linked_pr_ids?: string[];
            /** Slugs to PRs from this repository which are to be linked to the issue. Cannot be used with linked_pr_id. For example ["1", "2", "10"] */
            linked_pr_slugs?: string[];
            milestone_id?: string;
            milestone_slug?: string;
            priority?: components["schemas"]["Priority"];
            /** Status. System-wide statuses: open, inProgress, paused, closed, declined, duplicate */
            status_slug?: string;
            /** Issue title (up to 1024 characters) */
            title: string;
            visibility?: components["schemas"]["Issue.Visibility"];
        };
        CreateIssueCommentBody: {
            body?: string;
            parent_id?: string;
        };
        CreateLabelBody: {
            /** optional, default color is gray */
            color?: string;
            /** label name */
            name: string;
            /** optional, default slug is generated from name */
            slug?: string;
        };
        CreateLinkBody: {
            link_type?: components["schemas"]["IssueLink.LinkType"];
            target_issue_id?: string;
            target_issue_slug?: string;
        };
        CreateMilestoneBody: {
            /**
             * optional, milestone deadline (end date)
             * Format: date-time
             */
            deadline?: string;
            /** optional, milestone description */
            description?: string;
            /** milestone name */
            name: string;
            /** optional, default slug is generated from name */
            slug?: string;
            /**
             * optional, milestone start date
             * Format: date-time
             */
            start_date?: string;
        };
        CreateOrganizationInvitesBody: {
            /** List of invitees */
            invitees?: components["schemas"]["InviteeInput"][];
            /**
             * Time-to-live in days (1 to 30, empty means default: 14)
             * Format: int64
             */
            ttl_in_days?: number;
        };
        CreateOrganizationInvitesOperation: {
            /**
             * Timestamp when operation was created
             * Format: date-time
             */
            created_at?: string;
            error?: components["schemas"]["OperationError"];
            /**
             * Timestamp when operation was last modified
             * Format: date-time
             */
            modified_at?: string;
            /** Operation ID */
            operation_id?: string;
            response?: components["schemas"]["CreateOrganizationInvitesOperationResult"];
            status?: components["schemas"]["OperationStatus"];
            /** URL to poll for operation status */
            status_url?: string;
        };
        CreateOrganizationInvitesOperationResult: {
            /** @description Per-invite errors. Each error identifies which invitee failed and why. */
            errors?: components["schemas"]["InviteError"][];
            /** @description Invites that were successfully created and are waiting for acceptance. */
            invites?: components["schemas"]["Invite"][];
        };
        CreateProjectBody: {
            description?: string;
            name: string;
            slug?: string;
            visibility?: components["schemas"]["Project.Visibility"];
            website?: string;
        };
        CreatePullRequestBody: {
            /** Optional. Pull request description (up to 64Kb) */
            description?: string;
            /** Optional. Fork repository ID if creating PR from another repository */
            fork_repo_id?: string;
            /** Whether to publish the PR immediately (default: false = draft) */
            publish?: boolean;
            /** @description Optional. List of user IDs to assign as reviewers. */
            reviewer_ids?: string[];
            /** Source branch name */
            source_branch?: string;
            /** Target branch name */
            target_branch?: string;
            /** Pull request title (up to 1024 characters) */
            title?: string;
        };
        CreatePullRequestCommentBody: {
            anchor?: components["schemas"]["ShortAnchor"];
            body?: string;
            /** Optional iteration specification (defaults to latest iteration) */
            iteration?: string;
            /** Indicates an issue in PR that must be resolved before merge */
            need_resolution?: boolean;
            parent_id?: string;
            /** publish immediately (defaults to true) */
            publish?: boolean;
        };
        CreateReleaseBody: {
            /** Determines whether the release is to be created as draft or published immediately */
            publish?: boolean;
            release_notes?: string;
            tag?: string;
            /** If provided, tag creation will be attempted on publish; will fail on existing tag */
            target_branch?: string;
            title?: string;
        };
        CreateRepositoryBody: {
            /** Repository description (up to 4096 characters) */
            description?: string;
            init_settings?: components["schemas"]["InitSettings"];
            /** Deprecated: obsolete. Will be ignored even when specified. Will be removed in future API iterations */
            name?: string;
            /** Repository slug (up to 256 characters) */
            slug: string;
            templating_options?: components["schemas"]["TemplatingOptions"];
            visibility?: components["schemas"]["Repository.Visibility"];
        };
        CreateTeamBody: {
            description?: string;
            slug: string;
        };
        Cube: {
            artifacts?: components["schemas"]["Artifact"][];
            dates?: components["schemas"]["DatesByStage"];
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            id?: string;
            relations?: components["schemas"]["Relations"];
            /** A name of the cube as defined in the config */
            slug?: string;
            status?: components["schemas"]["Run.Status"];
        };
        DatesByStage: {
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            finished_at?: string;
            /** Format: date-time */
            started_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        /** @enum {string} */
        DeltaAction: "add" | "remove";
        Dependency: {
            name?: string;
        };
        /** @description A single file entry in a pull request diff. */
        DiffEntry: {
            /**
             * Format: int64
             * @description Number of added lines.
             */
            additions?: string;
            /**
             * Format: int64
             * @description Total changed lines (additions + deletions).
             */
            changes?: string;
            /**
             * Format: int64
             * @description Number of deleted lines.
             */
            deletions?: string;
            /** @description Current file path. */
            filename?: string;
            /** @description Unified diff hunks starting with @@. Empty for binary files. */
            patch?: string;
            patch_error?: components["schemas"]["PatchError"];
            /** @description Previous file path (only set for renamed files). */
            previous_filename?: string;
            status?: components["schemas"]["DiffEntry.Status"];
        };
        /** @enum {string} */
        "DiffEntry.Status": "added" | "removed" | "modified" | "renamed";
        DiffPos: {
            /**
             * Format: int32
             * @description Start of commented region, line number (1-based).
             */
            from?: number;
            /** @description Indicates whether commented region has changed after initial comment publishing. */
            outdated?: boolean;
            side?: components["schemas"]["Side"];
            /**
             * Format: int32
             * @description End of commented region, line number (1-based).
             */
            to?: number;
        };
        DiscoverRepositoriesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            repositories?: components["schemas"]["Repository"][];
        };
        /** Common header included in all public events */
        EventHeader: {
            /** ID of the primary entity this event is about */
            aggregate_id?: string;
            /** Type of the primary entity (derived from event_type) */
            aggregate_type?: string;
            /**
             * @description Causation ID is the ID of the event that directly caused this event.
             *     Empty for root events (events triggered directly by user actions).
             *     Used to reconstruct the event tree within a correlation chain.
             */
            causation_id?: string;
            /**
             * @description Correlation ID for tracking event chains back to the original request.
             *     Uses request_id from the originating gRPC/HTTP request when available,
             *     falls back to trace_id or the root event's ID.
             */
            correlation_id?: string;
            /** Unique identifier for this event instance */
            id?: string;
            /** Public metadata */
            metadata?: {
                [key: string]: string;
            };
            /**
             * When the event occurred
             * Format: date-time
             */
            occurred_at?: string;
            /** Organization context */
            organization_id?: string;
            /** Repository context */
            repository_id?: string;
            triggered_by?: components["schemas"]["UserEmbedded"];
            /** Event type */
            type?: string;
        };
        /**
         * @description Describes how a CI/CD run was initiated. Values are trigger categories and do not
         *     identify a concrete EventBus event.
         *
         *      - push: Triggered by a repository ref update.
         *      - pr_update: Triggered by a pull request event.
         *      - manual: Started explicitly by a user or API client.
         *      - restart: Restarts a workflow from an existing run.
         *      - schedule: Started by a configured schedule.
         *      - repository_event: Started after a supported repository EventBus event matched the CI configuration.
         *     The concrete EventBus type, for example, `issue_comment.create`, is not represented
         *     by this enum.
         * @enum {string}
         */
        EventType: "push" | "pr_update" | "manual" | "restart" | "schedule" | "repository_event";
        /** @enum {string} */
        FileType: "image" | "document" | "video" | "container";
        ForkRepositoryBody: {
            /** Copy only the default branch. If false, all branches will be copied */
            default_branch_only?: boolean;
            /** Organization ID where the fork will be created (use either org_slug or org_id) */
            org_id?: string;
            /** Organization slug where the fork will be created (use either org_slug or org_id) */
            org_slug?: string;
            /** Slug for the forked repository (up to 256 characters). If not specified, uses the source repository slug */
            slug?: string;
        };
        GenerateReleaseNotesBody: {
            /** @description Restricts generated notes to PRs that touched any of the given paths. */
            path_filters?: string[];
            /**
             * @description The name of the previous tag to use as the starting point for the release notes.
             *     Use to manually specify the range of changes considered as part of this release.
             *     If empty, the latest prior release is used.
             */
            previous_tag?: string;
            /** @description Target tag of the release. May or may not exist yet. */
            tag?: string;
            /** @description Branch, ref or SHA used to resolve `tag` when it doesn't exist yet. */
            target_branch?: string;
        };
        GenerateReleaseNotesResponse: {
            /** @description Rendered markdown body. */
            release_notes?: string;
            /** @description Suggested release title. */
            title?: string;
        };
        GetCubeArtifactsResponse: {
            /**
             * @description List of artifacts filtered by specified workflow/task/cube.
             *     Each item contains info about the artifact and a temporary download URL.
             */
            artifacts?: components["schemas"]["Artifact"][];
        };
        GetCubeLogsResponse: {
            /** @description This flag is set to true when the the cube's execution has finished and no more logs will be written. */
            done?: boolean;
            logs?: string;
            /**
             * @description This flag is set to true when the corresponding page of logs was fully written.
             *     If `page_complete` is false, requests for the next pages will result in a status code 'Not Found'.
             */
            page_complete?: boolean;
        };
        GetMyRatingReactionResponse: {
            reaction?: components["schemas"]["RepositoryRatingReaction"];
        };
        GetOrganizationNeurocreditsUsageResponse: {
            entries?: components["schemas"]["NeurocreditsUsageEntry"][];
            next_page_token?: string;
        };
        /** @description Exactly one of the fields must be provided */
        GitRevision: {
            /** Branch name */
            branch?: string;
            /** Commit hash */
            commit?: string;
            /** Tag name */
            tag?: string;
        };
        /**
         * Hunk represent transformation that will modify region
         *     in left side from_start:from_start+from_count into region
         *     in right side to_start:to_count
         */
        Hunk: {
            /** Format: int32 */
            from_count?: number;
            /** Format: int32 */
            from_start?: number;
            patch?: string;
            /** Format: int32 */
            to_count?: number;
            /** Format: int32 */
            to_start?: number;
        };
        Image: {
            url?: string;
        };
        InitSettings: {
            /** Whether to create README.md file with repository slug and description */
            create_readme?: boolean;
            /** Repository default branch (up to 256 characters). Optional, "main" if omitted */
            default_branch?: string;
            /** Gitignore preset names */
            gitignore_presets?: string[];
            /** License preset slug */
            license_slug?: string;
            /** The yaml specification template slug for launching ci */
            src_yaml_template_slug?: string;
        };
        InputValue: {
            name?: string;
            value?: string;
        };
        /**
         * @description Invite represents an organization invitation.
         *     Exactly one of email, alias, or invitee is set depending on invite type.
         */
        Invite: {
            /** Human-readable identifier for code-based invite */
            alias?: string;
            /**
             * When the invitation was created
             * Format: date-time
             */
            created_at?: string;
            /** Email address of the invitee (for external users) */
            email?: string;
            /**
             * When the invitation expires
             * Format: date-time
             */
            expires_at?: string;
            /** Unique identifier of the invite */
            id?: string;
            /** Invite URL for code-based invites. Only returned in create operation response */
            invite_link?: string;
            invitee?: components["schemas"]["UserEmbedded"];
            status?: components["schemas"]["InviteStatus"];
            subject?: components["schemas"]["Subject"];
        };
        /** @description Input for invite recipient. Exactly one of email, slug, or alias must be specified. */
        InviteeInput: {
            /** @description Human-readable identifier for code-based invite. Generates invite_link in response. */
            alias?: string;
            /** Email address (for external users) */
            email?: string;
            /** User slug (for registered users) */
            slug?: string;
        };
        InviteError: {
            error_code?: string;
            invitee?: components["schemas"]["InviteeInput"];
            message?: string;
        };
        /** @enum {string} */
        InviteStatus: "creating" | "pending" | "accepted" | "rejected";
        Issue: {
            assignee?: components["schemas"]["UserEmbedded"];
            author?: components["schemas"]["UserEmbedded"];
            /**
             * Timestamp when the issue was last moved to completed or canceled status
             * Format: date-time
             */
            completed_at?: string;
            /** Format: date-time */
            created_at?: string;
            /**
             * User-defined deadline for the issue
             * Format: date-time
             */
            deadline?: string;
            description?: string;
            id?: string;
            labels?: components["schemas"]["LabelEmbedded"][];
            linked_prs?: components["schemas"]["PullRequestEmbedded"][];
            milestone?: components["schemas"]["MilestoneEmbedded"];
            priority?: components["schemas"]["Priority"];
            repository?: components["schemas"]["RepositoryEmbedded"];
            slug?: string;
            /**
             * Timestamp when the issue was last moved to in_progress status
             * Format: date-time
             */
            started_at?: string;
            status?: components["schemas"]["IssueStatus"];
            title?: string;
            /** Format: date-time */
            updated_at?: string;
            updated_by?: components["schemas"]["UserEmbedded"];
            visibility?: components["schemas"]["Issue.Visibility"];
        };
        /** @enum {string} */
        "Issue.Visibility": "public" | "private";
        IssueComment: {
            attachments?: components["schemas"]["AttachmentEmbedded"][];
            author?: components["schemas"]["UserEmbedded"];
            body?: string;
            /** Format: date-time */
            created_at?: string;
            id?: string;
            parent?: components["schemas"]["IssueCommentEmbedded"];
            /** key is one of Reactions */
            reactions?: {
                [key: string]: components["schemas"]["ReactionCount"];
            };
            /** Format: date-time */
            updated_at?: string;
            updated_by?: components["schemas"]["UserEmbedded"];
        };
        /** IssueCommentCreate event - represents creation of an issue comment */
        IssueCommentCreate: {
            comment?: components["schemas"]["IssueComment"];
            header?: components["schemas"]["EventHeader"];
            /** Whether this is a top-level thread (not a reply) */
            is_thread?: boolean;
            issue?: components["schemas"]["Issue"];
            repository?: components["schemas"]["Repository"];
        };
        /** IssueCommentDelete event - represents deletion of an issue comment */
        IssueCommentDelete: {
            comment?: components["schemas"]["IssueComment"];
            header?: components["schemas"]["EventHeader"];
            issue?: components["schemas"]["Issue"];
            repository?: components["schemas"]["Repository"];
        };
        IssueCommentEmbedded: {
            id?: string;
        };
        /** IssueCommentReactionsUpdate event - represents update of reactions on an issue comment */
        IssueCommentReactionsUpdate: {
            /** Reactions that were added */
            added_reactions?: components["schemas"]["Reaction"][];
            comment?: components["schemas"]["IssueComment"];
            header?: components["schemas"]["EventHeader"];
            issue?: components["schemas"]["Issue"];
            /** Reactions that were removed */
            removed_reactions?: components["schemas"]["Reaction"][];
            repository?: components["schemas"]["Repository"];
        };
        /** IssueCommentUpdate event - represents update of an issue comment */
        IssueCommentUpdate: {
            comment?: components["schemas"]["IssueComment"];
            header?: components["schemas"]["EventHeader"];
            issue?: components["schemas"]["Issue"];
            repository?: components["schemas"]["Repository"];
        };
        /** IssueCreate event - represents creation of a new issue */
        IssueCreate: {
            header?: components["schemas"]["EventHeader"];
            issue?: components["schemas"]["Issue"];
            repository?: components["schemas"]["Repository"];
        };
        /** IssueDelete event - represents deletion of an issue */
        IssueDelete: {
            header?: components["schemas"]["EventHeader"];
            issue?: components["schemas"]["Issue"];
            repository?: components["schemas"]["Repository"];
        };
        IssueEmbedded: {
            id?: string;
            slug?: string;
        };
        IssueLabelsResponse: {
            labels?: components["schemas"]["v1.Label"][];
        };
        IssueLink: {
            author?: components["schemas"]["UserEmbedded"];
            /** Format: date-time */
            created_at?: string;
            id?: string;
            link_type?: components["schemas"]["IssueLink.LinkType"];
            source?: components["schemas"]["IssueEmbedded"];
            target?: components["schemas"]["IssueEmbedded"];
            /** Format: date-time */
            updated_at?: string;
            updated_by?: components["schemas"]["UserEmbedded"];
        };
        /** @enum {string} */
        "IssueLink.LinkType": "related_to" | "parent_of" | "subissue_of" | "blocks" | "blocked_by" | "duplicates" | "duplicated_by";
        IssueLinkedPRsResponse: {
            pull_requests?: components["schemas"]["PullRequest"][];
        };
        IssueStatus: {
            id?: string;
            name?: string;
            slug?: string;
            status_type?: components["schemas"]["StatusType"];
        };
        /** IssueUpdate event - represents update of an issue */
        IssueUpdate: {
            /** Fields whose values actually changed, using paths from the Issue resource */
            changed_fields?: string;
            header?: components["schemas"]["EventHeader"];
            issue?: components["schemas"]["Issue"];
            previous_issue?: components["schemas"]["Issue"];
            repository?: components["schemas"]["Repository"];
        };
        LabelEmbedded: {
            color?: string;
            id?: string;
            name?: string;
            slug?: string;
        };
        Language: {
            color?: string;
            name?: string;
        };
        Link: {
            link?: string;
            type?: components["schemas"]["Link.LinkType"];
        };
        /** @enum {string} */
        "Link.LinkType": "default" | "social_network" | "homepage" | "email" | "telegram";
        ListBranchesResponse: {
            branches?: components["schemas"]["Branch"][];
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
        };
        ListContributorsResponse: {
            contributors?: components["schemas"]["UserProfile"][];
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
        };
        ListIssueCommentsResponse: {
            issue_comments?: components["schemas"]["IssueComment"][];
            next_page_token?: string;
        };
        ListIssuesAssignedToAuthenticatedUserResponse: {
            issues?: components["schemas"]["Issue"][];
            next_page_token?: string;
        };
        ListIssueStatusesResponse: {
            next_page_token?: string;
            statuses?: components["schemas"]["IssueStatus"][];
        };
        ListLabelsForRepositoryResponse: {
            items?: components["schemas"]["v1.Label"][];
            next_page_token?: string;
        };
        ListLinksResponse: {
            links?: components["schemas"]["IssueLink"][];
            next_page_token?: string;
        };
        ListMilestonesForRepositoryResponse: {
            items?: components["schemas"]["Milestone"][];
            next_page_token?: string;
        };
        ListMyPersonalQuotasResponse: {
            quotas?: components["schemas"]["QuotaLimit"][];
        };
        /**
         * Role selector for listing PRs related to a user
         * @enum {string}
         */
        "ListMyPullRequestsRequest.Role": "author" | "reviewer" | "any";
        ListOccupiedCodeAssistWorkplacesResponse: {
            next_page_token?: string;
            users?: components["schemas"]["OccupiedWorkplaceUserInfo"][];
        };
        ListOrganizationInvitesResponse: {
            /** List of invitations */
            invites?: components["schemas"]["Invite"][];
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
        };
        ListOrganizationProjectsResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            projects?: components["schemas"]["Project"][];
        };
        ListOrganizationRepositoriesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            repositories?: components["schemas"]["Repository"][];
        };
        ListOrganizationRolesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            /** List of organization roles */
            org_subject_roles?: components["schemas"]["OrgSubjectRole"][];
            /** @description List of repository roles that are set on the organization level. These roles are inherited by all repositories in the organization. */
            repo_subject_roles?: components["schemas"]["SubjectRole"][];
        };
        ListProjectRepositoriesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            repositories?: components["schemas"]["Repository"][];
        };
        ListProjectRolesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            subject_roles?: components["schemas"]["ProjectSubjectRole"][];
        };
        ListPullRequestCommentsResponse: {
            next_page_token?: string;
            pull_request_comments?: components["schemas"]["PullRequestComment"][];
        };
        ListPullRequestFilesResponse: {
            /** @description List of changed files with diff patches. */
            files?: components["schemas"]["DiffEntry"][];
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is empty, there are no subsequent pages.
             */
            next_page_token?: string;
        };
        ListQuotasResponse: {
            quotas?: components["schemas"]["QuotaLimit"][];
        };
        ListRatingReactionsResponse: {
            /** @description A token which can be sent as page_token to retrieve the next page. */
            next_page_token?: string;
            reactions?: components["schemas"]["MyRepositoryRatingReaction"][];
        };
        ListReleasesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            releases?: components["schemas"]["Release"][];
        };
        ListRepoRolesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            subject_roles?: components["schemas"]["SubjectRole"][];
        };
        ListRepositoryIssuesResponse: {
            /** Issues from specific repository */
            issues?: components["schemas"]["Issue"][];
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
        };
        ListRepositoryPullRequestsResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            pull_requests?: components["schemas"]["PullRequest"][];
        };
        /** ListReviewersResponse contains information about all the reviewers of pull request */
        ListReviewersResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            reviewers?: components["schemas"]["PRReviewer"][];
        };
        ListRunsResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            /** List of CI/CD runs */
            runs?: components["schemas"]["Run"][];
        };
        ListSecretsResponse: {
            secrets?: components["schemas"]["SecretEntry"][];
        };
        ListTagsResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            tags?: components["schemas"]["v1.Tag"][];
        };
        ListTeamMembersResponse: {
            members?: components["schemas"]["TeamMember"][];
            next_page_token?: string;
        };
        ListTeamsResponse: {
            next_page_token?: string;
            teams?: components["schemas"]["Team"][];
        };
        ListTreeResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            trees?: components["schemas"]["TreeEntry"][];
        };
        /**
         * Role selector for listing PRs related to a user
         * @enum {string}
         */
        "ListUserPullRequestsRequest.Role": "author" | "reviewer" | "any";
        /**
         * Detailed merge checks for a pull request
         *     Contains all merge requirements and their current status
         */
        MergeChecks: {
            /** CI workflow checks (may be multiple workflows) */
            ci_workflows?: components["schemas"]["CIWorkflowCheck"][];
            code_review?: components["schemas"]["CodeReviewCheck"];
            /** Configuration validation checks */
            config_validations?: components["schemas"]["ConfigValidationCheck"][];
            conflicts?: components["schemas"]["ConflictsCheck"];
            status?: components["schemas"]["MergeChecks.Status"];
        };
        /**
         * Common merge check status for every check except CI. CI checks have more
         *     extensive status values, including 'canceled' and 'timeout', see CICheckStatus
         * @enum {string}
         */
        "MergeChecks.Status": "in_progress" | "success" | "failure";
        MergeInfo: {
            /** filled after merge */
            error?: string;
            /** filled after merge */
            merge_commit_hash?: string;
            merge_parameters?: components["schemas"]["MergeParameters"];
            merger?: components["schemas"]["UserEmbedded"];
            target_commit_hash?: string;
        };
        MergeParameters: {
            rebase?: boolean;
            squash?: boolean;
        };
        MergePullRequestBody: {
            /** Delete source branch after successful merge; default value inherited from config */
            delete_branch?: boolean;
            /** Force merge even if some checks are failing (requires special permissions); default: false */
            force?: boolean;
            /** Use rebase merge strategy (linearize history); default value inherited from config */
            rebase?: boolean;
            /** Squash all commits into a single commit; default value inherited from config */
            squash?: boolean;
        };
        MergePullRequestOperation: {
            /**
             * Timestamp when operation was created
             * Format: date-time
             */
            created_at?: string;
            error?: components["schemas"]["OperationError"];
            /**
             * Timestamp when operation was last modified
             * Format: date-time
             */
            modified_at?: string;
            /** Unique operation identifier */
            operation_id?: string;
            response?: components["schemas"]["MergePullRequestOperationResult"];
            status?: components["schemas"]["OperationStatus"];
            /** URL to poll for operation status */
            status_url?: string;
        };
        MergePullRequestOperationResult: {
            /** Hash of the resulting merge commit in the target branch */
            merge_commit_hash?: string;
            merge_parameters?: components["schemas"]["MergeParameters"];
            /** Hash of the exact commit of the target branch that was used as a merge base */
            target_commit_hash?: string;
        };
        MigrationSource: {
            domain?: string;
            url?: string;
        };
        Milestone: {
            author?: components["schemas"]["UserEmbedded"];
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            deadline?: string;
            description?: string;
            id?: string;
            name?: string;
            slug?: string;
            /** Format: date-time */
            start_date?: string;
            status?: components["schemas"]["Milestone.Status"];
            /** Format: date-time */
            updated_at?: string;
            updated_by?: components["schemas"]["UserEmbedded"];
        };
        /** @enum {string} */
        "Milestone.Status": "open" | "closed";
        MilestoneEmbedded: {
            id?: string;
            slug?: string;
        };
        ModifyLabelCollectionRequest: {
            ids?: string[];
            slugs?: string[];
        };
        ModifyPullRequestCollectionRequest: {
            ids?: string[];
            slugs?: string[];
        };
        ModifyReactionBody: {
            reaction?: components["schemas"]["Reaction"];
        };
        MyRepositoryRatingReaction: {
            reaction?: components["schemas"]["RepositoryRatingReaction"];
            repository?: components["schemas"]["RepositoryEmbedded"];
        };
        NeurocreditsUsageEntry: {
            /** Date in YYYY-MM-DD format */
            date?: string;
            model?: string;
            /** Format: double */
            neurocredits?: number;
            product?: components["schemas"]["AIProduct"];
            user?: components["schemas"]["UserEmbedded"];
        };
        /** @description OccupiedWorkplaceUserInfo contains information about a user occupying a code assist workplace. */
        OccupiedWorkplaceUserInfo: {
            user?: components["schemas"]["UserProfile"];
        };
        OccupyCodeAssistWorkplacesBulkBody: {
            user_ids?: string[];
        };
        OperationError: {
            /** Optional details. Exact structure depends on error_code */
            details?: {
                [key: string]: string;
            };
            /** Error code that can be used for error handling */
            error_code?: string;
            /** Human-readable message */
            message?: string;
        };
        /** @enum {string} */
        OperationStatus: "scheduled" | "in_progress" | "success" | "failed" | "cancel";
        Organization: {
            display_name?: string;
            id?: string;
            logo?: components["schemas"]["Image"];
            slug?: string;
            visibility?: components["schemas"]["Organization.Visibility"];
            web_url?: string;
        };
        /** @enum {string} */
        "Organization.Visibility": "public" | "internal" | "private";
        OrganizationEmbedded: {
            id?: string;
            slug?: string;
        };
        /** @enum {string} */
        OrgRole: "org_owner" | "org_admin";
        /** OrgSubjectRole contains information about subject and his role in the organization */
        OrgSubjectRole: {
            role?: components["schemas"]["OrgRole"];
            subject?: components["schemas"]["Subject"];
        };
        /** @enum {string} */
        PatchError: "binary" | "too_large" | "diff_limit_exceeded" | "timeout" | "error";
        /** Ping event - sent when a webhook is tested */
        Ping: {
            header?: components["schemas"]["EventHeader"];
            organization?: components["schemas"]["OrganizationEmbedded"];
            /**
             * When the ping was sent
             * Format: date-time
             */
            pinged_at?: string;
            repository?: components["schemas"]["RepositoryEmbedded"];
            /** Webhook slug identifier */
            webhook_slug?: string;
        };
        /**
         * mapping is done by const name, except for the unspecified
         * @enum {string}
         */
        Priority: "trivial" | "minor" | "normal" | "critical" | "blocker";
        ProfileStatus: {
            emoji?: string;
            message?: string;
        };
        /** @enum {string} */
        ProfileVisibility: "private" | "public";
        Progress: {
            current_cube?: components["schemas"]["Cube"];
            /** Format: float */
            percent?: number;
        };
        Project: {
            /** Format: date-time */
            created_at?: string;
            description?: string;
            id?: string;
            logo?: components["schemas"]["Image"];
            name?: string;
            organization?: components["schemas"]["OrganizationEmbedded"];
            slug?: string;
            /** Format: date-time */
            updated_at?: string;
            visibility?: components["schemas"]["Project.Visibility"];
            website?: string;
        };
        /** @enum {string} */
        "Project.Visibility": "public" | "internal" | "private";
        ProjectEmbedded: {
            id?: string;
            slug?: string;
        };
        /** @enum {string} */
        ProjectRole: "project_viewer" | "project_developer" | "project_maintainer" | "project_admin";
        /** @description ProjectSubjectRole contains information about a subject and its role in a project. */
        ProjectSubjectRole: {
            role?: components["schemas"]["ProjectRole"];
            subject?: components["schemas"]["Subject"];
        };
        PRReviewer: {
            /** Format: date-time */
            created_at?: string;
            review_decision?: components["schemas"]["ReviewDecision"];
            /** Format: date-time */
            updated_at?: string;
            user?: components["schemas"]["UserEmbedded"];
        };
        PublishPullRequestCommentsDraftsBody: {
            pull_request_id?: string;
            /** do not notify subscribers */
            silent?: boolean;
        };
        PublishPullRequestCommentsDraftsByIDBody: {
            org_slug?: string;
            pull_request_slug?: string;
            repo_slug?: string;
            /** do not notify subscribers */
            silent?: boolean;
        };
        PublishPullRequestCommentsDraftsResponse: {
            /** Format: uint64 */
            published_count?: string;
        };
        PullRequest: {
            author?: components["schemas"]["UserEmbedded"];
            /** Format: date-time */
            created_at?: string;
            description?: string;
            id?: string;
            labels?: components["schemas"]["LabelEmbedded"][];
            merge_info?: components["schemas"]["MergeInfo"];
            repository?: components["schemas"]["RepositoryEmbedded"];
            slug?: string;
            source?: components["schemas"]["PullRequestBranch"];
            /** Deprecated, use `source` instead */
            source_branch?: string;
            status?: components["schemas"]["PullRequest.Status"];
            target?: components["schemas"]["PullRequestBranch"];
            /** Deprecated, use `target` instead */
            target_branch?: string;
            title?: string;
            /** Format: date-time */
            updated_at?: string;
            updated_by?: components["schemas"]["UserEmbedded"];
        };
        /** @enum {string} */
        "PullRequest.Status": "draft" | "open" | "discarded" | "merging" | "merged";
        PullRequestBranch: {
            /** "org/repo:branch-name" */
            label?: string;
            /** branch name */
            ref?: string;
            /** commit SHA (hex) */
            sha?: string;
        };
        PullRequestComment: {
            anchor?: components["schemas"]["Anchor"];
            author?: components["schemas"]["UserEmbedded"];
            body?: string;
            /** Format: date-time */
            created_at?: string;
            id?: string;
            is_deleted?: boolean;
            is_outdated?: boolean;
            is_published?: boolean;
            /** @description Deprecated: use resolution_state instead. */
            is_resolved?: boolean;
            /** Format: uint64 */
            iteration?: string;
            /** @description Deprecated: use resolution_state instead. */
            need_resolution?: boolean;
            parent_id?: string;
            reactions?: {
                [key: string]: components["schemas"]["ReactionCount"];
            };
            resolution_state?: components["schemas"]["ResolutionState"];
            type?: components["schemas"]["PullRequestComment.Type"];
            /** Format: date-time */
            updated_at?: string;
            updated_by?: components["schemas"]["UserEmbedded"];
        };
        /** @enum {string} */
        "PullRequestComment.Type": "default" | "appsec";
        /** PullRequestCommentCreate event - represents creation of a pull request comment */
        PullRequestCommentCreate: {
            comment?: components["schemas"]["PullRequestComment"];
            header?: components["schemas"]["EventHeader"];
            /** Whether the comment was published (visible) or draft */
            is_published?: boolean;
            /** Whether this is a top-level thread (not a reply) */
            is_thread?: boolean;
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestCommentCreateBulk event - represents bulk creation of pull request comments */
        PullRequestCommentCreateBulk: {
            /** The comments that were created */
            comments?: components["schemas"]["PullRequestComment"][];
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestCommentReactionsUpdate event - represents update of reactions on a pull request comment */
        PullRequestCommentReactionsUpdate: {
            /** Reactions that were added */
            added_reactions?: components["schemas"]["Reaction"][];
            comment?: components["schemas"]["PullRequestComment"];
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            /** Reaction that were removed */
            removed_reactions?: components["schemas"]["Reaction"][];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestCommentsPublish event - represents publishing of draft pull request comments */
        PullRequestCommentsPublish: {
            /** Comments that were published */
            comments?: components["schemas"]["PullRequestComment"][];
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestCreate event - represents creation of a new pull request */
        PullRequestCreate: {
            /**
             * When the pull request was created
             * Format: date-time
             */
            created_at?: string;
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        PullRequestEmbedded: {
            id?: string;
            slug?: string;
        };
        PullRequestLabelsResponse: {
            labels?: components["schemas"]["v1.Label"][];
        };
        /** PullRequestMerge event - represents merge success of a pull request */
        PullRequestMerge: {
            header?: components["schemas"]["EventHeader"];
            /** Merge hash of the pull request */
            merge_hash?: string;
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestMergeFailure event - represents merge failure of a pull request */
        PullRequestMergeFailure: {
            /** Error message of the merge failure */
            error_message?: string;
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestNewIteration event - represents new iteration on a pull request */
        PullRequestNewIteration: {
            /** Commit SHA of the iteration */
            commit_sha?: string;
            /**
             * Iteration created at timestamp
             * Format: date-time
             */
            created_at?: string;
            header?: components["schemas"]["EventHeader"];
            /** Merge base SHA of the iteration */
            merge_base_sha?: string;
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
            /**
             * Iteration updated at timestamp
             * Format: date-time
             */
            updated_at?: string;
        };
        /** PullRequestPublish event - represents publish of a pull request */
        PullRequestPublish: {
            header?: components["schemas"]["EventHeader"];
            previous_status?: components["schemas"]["PullRequest.Status"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestRefresh event - represents refresh of a pull request */
        PullRequestRefresh: {
            /** Head SHA of the pull request */
            head_sha?: string;
            header?: components["schemas"]["EventHeader"];
            /** Merge base SHA of the pull request */
            merge_base_sha?: string;
            previous_status?: components["schemas"]["PullRequest.Status"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** PullRequestReviewAssignment event - represents changes to pull request reviewers */
        PullRequestReviewAssignment: {
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
            /** Reviewers deltas */
            reviewer_deltas?: components["schemas"]["v1.ReviewerDelta"][];
            user?: components["schemas"]["UserEmbedded"];
        };
        /** PullRequestReviewDecision event - represents a review decision on a pull request */
        PullRequestReviewDecision: {
            decision?: components["schemas"]["ReviewDecision"];
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
            user?: components["schemas"]["UserEmbedded"];
        };
        /** PullRequestUpdate event - represents update of a pull request */
        PullRequestUpdate: {
            header?: components["schemas"]["EventHeader"];
            pull_request?: components["schemas"]["PullRequest"];
            repository?: components["schemas"]["Repository"];
        };
        /** Push event - represents git push operation to a repository */
        Push: {
            /**
             * @description Commits details for this event, from before_sha to after_sha.
             *     In case of tag push or new branch creation before_sha is zero
             *     and commits contain only single commit.
             */
            commits?: components["schemas"]["Commit"][];
            /** The default branch reference name (e.g., "refs/heads/main") */
            default_branch?: string;
            /** Whether there are more commits (due to commits limit) */
            has_more_commits?: boolean;
            header?: components["schemas"]["EventHeader"];
            /** Whether the default branch was updated in this push */
            is_default_branch_updated?: boolean;
            /** Format: date-time */
            pushed_at?: string;
            pusher?: components["schemas"]["UserEmbedded"];
            ref_update?: components["schemas"]["RefUpdate"];
            repository?: components["schemas"]["Repository"];
        };
        QuotaLimit: {
            /** Format: double */
            limit?: number;
            quota_id?: string;
            /** Format: double */
            usage?: number;
        };
        RateRepositoryBody: {
            reaction: components["schemas"]["RepositoryRatingReaction.Type"];
        };
        RateRepositoryResponse: {
            reaction?: components["schemas"]["RepositoryRatingReaction"];
        };
        /** @enum {string} */
        Reaction: "like" | "dislike" | "heart" | "check_mark" | "eyes" | "fire" | "victory_hand" | "heart_eyes" | "hundred_points" | "party_popper" | "party_face" | "rolling_eyes" | "fist" | "clapping_hands" | "thinking_face" | "neutral_face" | "winking_face" | "open_mouth" | "shrug" | "pleading_face" | "confused_face" | "smiling_face" | "sunglasses" | "rocket" | "robot" | "goose";
        ReactionCount: {
            /** Format: int32 */
            count?: number;
            self_react?: boolean;
        };
        Reactions: {
            reactions?: {
                [key: string]: components["schemas"]["ReactionCount"];
            };
        };
        /** RefsUpdate event - represents git refs update operation to a repository */
        RefsUpdate: {
            /** The default branch reference name (e.g., "refs/heads/main") */
            default_branch?: string;
            header?: components["schemas"]["EventHeader"];
            /** Whether the default branch was updated in this push */
            is_default_branch_updated?: boolean;
            /** Format: date-time */
            pushed_at?: string;
            pusher?: components["schemas"]["UserEmbedded"];
            /** Push details - supports multiple ref updates in a single push */
            ref_updates?: components["schemas"]["RefUpdate"][];
            repository?: components["schemas"]["RepositoryEmbedded"];
        };
        /** Represents a single ref update within a push */
        RefUpdate: {
            /** Commit SHA after the update (zeros for deleted ref) */
            after_sha?: string;
            /** For annotated tags: the peeled commit SHA before the update */
            before_checkout_sha?: string;
            /** Commit SHA before the update (zeros for new ref) */
            before_sha?: string;
            /** For annotated tags: the peeled SHA (commit the tag points to) */
            checkout_sha?: string;
            operation?: components["schemas"]["RefUpdateOperation"];
            /** The git reference being updated (e.g., "refs/heads/main") */
            ref?: string;
        };
        /**
         * Type of ref update operation
         * @enum {string}
         */
        RefUpdateOperation: "create" | "update" | "delete";
        Relations: {
            needs?: components["schemas"]["Dependency"][];
        };
        Release: {
            assets?: components["schemas"]["ReleaseAsset"][];
            author?: components["schemas"]["UserEmbedded"];
            /** Format: date-time */
            created_at?: string;
            hash?: string;
            id?: string;
            is_latest?: boolean;
            is_pre_release?: boolean;
            release_notes?: string;
            /** Format: date-time */
            released_at?: string;
            repo_id?: string;
            status?: components["schemas"]["Release.Status"];
            /** Release tag also serves as its slug */
            tag?: string;
            title?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        /** @enum {string} */
        "Release.Status": "draft" | "published" | "discarded";
        ReleaseAsset: {
            archive_link?: components["schemas"]["CodeArchive"];
            attachment?: components["schemas"]["Attachment"];
            id?: string;
            link?: string;
            name?: string;
        };
        ReleaseCodeAssistWorkplacesBulkBody: {
            user_ids?: string[];
        };
        RemoveOrganizationRolesBody: {
            /** @description List of repository roles that will be removed from the organization level. These roles are inherited by all repositories in the organization. */
            repo_subject_roles?: components["schemas"]["SubjectRole"][];
        };
        RemoveOrganizationRolesResponse: Record<string, never>;
        RemoveProjectRolesBody: {
            subject_roles?: components["schemas"]["ProjectSubjectRole"][];
        };
        RemoveProjectRolesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            subject_roles?: components["schemas"]["ProjectSubjectRole"][];
        };
        /** The request body specifies the users and their respective roles to be added from the repository */
        RemoveRepoRolesBody: {
            subject_roles?: components["schemas"]["SubjectRole"][];
        };
        /** The response returns all roles and users from the repository */
        RemoveRepoRolesResponse: {
            /**
             * @description A token, which can be sent as `page_token` to retrieve the next page.
             *     If this field is omitted, there are no subsequent pages.
             */
            next_page_token?: string;
            subject_roles?: components["schemas"]["SubjectRole"][];
        };
        /** @enum {string} */
        RepoRole: "viewer" | "contributor" | "developer" | "maintainer" | "admin";
        Repository: {
            clone_url?: components["schemas"]["CloneURL"];
            counters?: components["schemas"]["RepositoryCounters"];
            default_branch?: string;
            description?: string;
            id?: string;
            is_empty?: boolean;
            language?: components["schemas"]["Language"];
            /** Format: date-time */
            last_updated?: string;
            links?: components["schemas"]["Link"][];
            logo?: components["schemas"]["Image"];
            migration_source?: components["schemas"]["MigrationSource"];
            /** @description Deprecated: obsolete, prefer using slug. Will be removed in future API iterations. */
            name?: string;
            organization?: components["schemas"]["OrganizationEmbedded"];
            parent?: components["schemas"]["RepositoryEmbedded"];
            project?: components["schemas"]["ProjectEmbedded"];
            rating?: components["schemas"]["RepositoryRating"];
            slug?: string;
            template_type?: components["schemas"]["RepoTemplate"];
            visibility?: components["schemas"]["Repository.Visibility"];
            web_url?: string;
        };
        /** @enum {string} */
        "Repository.Visibility": "public" | "internal" | "private";
        RepositoryCounters: {
            /** Format: uint64 */
            branches?: string;
            /** Format: uint64 */
            forks?: string;
            /** Format: uint64 */
            issues?: string;
            /** Format: uint64 */
            pull_requests?: string;
            /** Format: uint64 */
            tags?: string;
        };
        RepositoryCreated: {
            header?: components["schemas"]["EventHeader"];
            repository?: components["schemas"]["Repository"];
        };
        RepositoryEmbedded: {
            id?: string;
            organization?: components["schemas"]["OrganizationEmbedded"];
            slug?: string;
        };
        /** @description Aggregated rating information for a repository. */
        RepositoryRating: {
            /**
             * Format: double
             * @description Repository percentile among rated repositories. Omitted while percentile data is unavailable.
             */
            percentile?: number;
            /** @description Reaction counters grouped by reaction type. */
            reaction_counts?: components["schemas"]["RepositoryRatingReactionCount"][];
            /**
             * Format: double
             * @description Current repository rating value.
             */
            value?: number;
        };
        /** @description A user's reaction that contributes to a repository rating. */
        RepositoryRatingReaction: {
            type?: components["schemas"]["RepositoryRatingReaction.Type"];
            /** Format: date-time */
            updated_at?: string;
        };
        /**
         * @description - none: Remove the current user's rating reaction.
         *      - positive_low: A low positive rating reaction. Corresponds to Like in the SourceCraft interface.
         *      - positive_medium: A medium positive rating reaction. Corresponds to Heart in the SourceCraft interface.
         *      - positive_high: A high positive rating reaction. Corresponds to Diamond in the SourceCraft interface.
         * @enum {string}
         */
        "RepositoryRatingReaction.Type": "none" | "positive_low" | "positive_medium" | "positive_high";
        /** @description Number of rating reactions of a particular type. */
        RepositoryRatingReactionCount: {
            /** Format: uint64 */
            count?: string;
            type?: components["schemas"]["RepositoryRatingReaction.Type"];
        };
        /** @enum {string} */
        RepoTemplate: "not_a_template" | "organizational" | "system";
        /**
         * @description Resolution state for pull request comments.
         *     Transition from `no_resolution_needed` directly to `resolved` is not allowed:
         *     set to `awaiting_resolution` first, then resolve.
         * @enum {string}
         */
        ResolutionState: "no_resolution_needed" | "awaiting_resolution" | "resolved";
        /** @enum {string} */
        ReviewDecision: "approve" | "trust" | "block" | "abstain";
        ReviewRule: {
            /**
             * Approves received for this rule
             * Format: int32
             */
            approves?: number;
            /** Whether this rule is satisfied */
            completed?: boolean;
            /**
             * Approves needed for this rule
             * Format: int32
             */
            need_approves?: number;
            /** Reviewers relevant to this rule */
            reviewers?: components["schemas"]["UserEmbedded"][];
        };
        /**
         * @description Run represents an instance of CI/CD run which may contain several workflow launches.
         *
         *     When Run is in `created` status, it is still in preparation for startup and can contain no workflows.
         *     After the status is no longer `created` (is `prepared` or `processing`), its workflows list
         *     is filled and finalized.
         *
         *     It is possible that 'Run Workflows' endpoint will return a Run that's no longer `created` or
         *     `prepared` if those stages were processed fast enough.
         */
        Run: {
            dates?: components["schemas"]["DatesByStage"];
            error_messages?: string[];
            event_type?: components["schemas"]["EventType"];
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            id?: string;
            pull?: components["schemas"]["PullRequestEmbedded"];
            /** Run counter serves as a slug */
            slug?: string;
            status?: components["schemas"]["Run.Status"];
            user?: components["schemas"]["UserEmbedded"];
            workflows?: components["schemas"]["Workflow"][];
        };
        /**
         * @description - prepared: Status `prepared` may only appear as a Run status.
         *     It's a stage between creation and startup during which the Run is populated with workflows.
         * @enum {string}
         */
        "Run.Status": "created" | "prepared" | "processing" | "success" | "failed" | "canceled" | "timeout" | "skipped" | "awaiting_approval" | "rejected";
        RunCIBody: {
            input?: components["schemas"]["WorkflowInput"];
            /**
             * The branch or tag to run the CI workflow on. If empty, the default branch (usually main) will be used.
             *     Examples: `mybranch`, `tags:v1.0.0`
             */
            revision?: string;
            /**
             * The branch, commit hash, or tag to retrieve the CI configuration from. If empty, the default branch (usually main) will be used.
             *     Examples: `mybranch`, `tags:v1.0.0`, `25ae02f94bef174fa7a44084908c6dda494862a9`
             */
            workflow_revision?: string;
        };
        RunCIWorkflowResponse: {
            flux_id?: string;
            flux_public_id?: string;
            trigger_status?: components["schemas"]["TriggerStatus"];
        };
        RunEmbedded: {
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            id?: string;
            /** Run counter serves as a slug */
            slug?: string;
        };
        RunWorkflowsBody: {
            config_revision?: components["schemas"]["GitRevision"];
            head?: components["schemas"]["GitRevision"];
            /**
             * Run shared workflows.
             *     If true, run shared workflows by user without access to repository
             */
            shared?: boolean;
            /**
             * @description Information specifying which workflows to run.
             *     Each workflow to run is defined by its name and, optionally, input parameters.
             */
            workflows?: components["schemas"]["WorkflowData"][];
        };
        SecretEntry: {
            key?: string;
            /** Format: byte */
            value?: string;
        };
        SecretsOperation: {
            /**
             * Timestamp when operation was created
             * Format: date-time
             */
            created_at?: string;
            error?: components["schemas"]["OperationError"];
            /**
             * Timestamp when operation was last modified
             * Format: date-time
             */
            modified_at?: string;
            /** Operation ID */
            operation_id?: string;
            response?: components["schemas"]["SecretsOperationResult"];
            status?: components["schemas"]["OperationStatus"];
            /** URL to poll for operation status */
            status_url?: string;
        };
        SecretsOperationResult: Record<string, never>;
        SetCodeAssistWorkplacesBody: {
            /** Format: int32 */
            workplaces?: number;
        };
        SetDecisionBody: {
            review_decision?: components["schemas"]["ReviewDecision"];
        };
        /** @description SetDecisionResponse contains information about set decision and pull request id. */
        SetDecisionResponse: {
            created_decision?: components["schemas"]["ReviewDecision"];
            pull_request_id?: string;
        };
        SetSecretBody: {
            /**
             * Format: byte
             * @description The secret value. Must be a base64-encoded string.
             */
            value?: string;
        };
        ShortAnchor: {
            /** Full file path from repository root */
            path?: string;
            position?: components["schemas"]["DiffPos"];
        };
        /** @enum {string} */
        Side: "target" | "source";
        Signature: {
            /**
             * Timestamp of the signature
             * Format: date-time
             */
            date?: string;
            /** Email of the person */
            email?: string;
            /** Name of the person */
            name?: string;
        };
        SignatureVerification: {
            reason?: components["schemas"]["SignatureVerificationReason"];
            verified?: boolean;
            /** Format: date-time */
            verified_at?: string;
        };
        /** @enum {string} */
        SignatureVerificationReason: "SIGNATURE_VERIFICATION_REASON_VALID" | "SIGNATURE_VERIFICATION_REASON_INVALID" | "SIGNATURE_VERIFICATION_REASON_MALFORMED_SIGNATURE" | "SIGNATURE_VERIFICATION_REASON_UNKNOWN_KEY" | "SIGNATURE_VERIFICATION_REASON_NO_USER" | "SIGNATURE_VERIFICATION_REASON_BAD_EMAIL" | "SIGNATURE_VERIFICATION_REASON_EXPIRED_KEY" | "SIGNATURE_VERIFICATION_REASON_NOT_SIGNING_KEY";
        /** @enum {string} */
        StatusType: "initial" | "in_progress" | "paused" | "completed" | "cancelled";
        /** Subject is an entity to which a role can be assigned */
        Subject: {
            /** Id will contain "<external-user>" if subject is an external user */
            id?: string;
            type?: components["schemas"]["SubjectType"];
        };
        /** SubjectRole contains information about subject and his role in the repository */
        SubjectRole: {
            role?: components["schemas"]["RepoRole"];
            subject?: components["schemas"]["Subject"];
        };
        /** @enum {string} */
        SubjectType: "user" | "invitee" | "team";
        Task: {
            cubes?: components["schemas"]["Cube"][];
            dates?: components["schemas"]["DatesByStage"];
            description?: string;
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            id?: string;
            progress?: components["schemas"]["Progress"];
            relations?: components["schemas"]["Relations"];
            /** A name of the task as defined in the config */
            slug?: string;
            status?: components["schemas"]["Run.Status"];
        };
        Team: {
            description?: string;
            /** @description IAM group ID of the team. Use this value as `Subject.id` when assigning roles with `type`=`team`. */
            id?: string;
            /** Format: int64 */
            members_count?: string;
            organization?: components["schemas"]["OrganizationEmbedded"];
            slug?: string;
        };
        /** @description TeamMember represents a team member. `subject.type` is `user` or `invitee`. */
        TeamMember: {
            subject?: components["schemas"]["Subject"];
            user?: components["schemas"]["UserEmbedded"];
        };
        TeamMemberDelta: {
            action?: components["schemas"]["DeltaAction"];
            /** @description Pending invitee by subject ID (same as `Subject.id` when `Subject.type`=`invitee`, see `Invite.subject`). */
            invitee_id?: string;
            /** @description Registered user by UUID (`UserEmbedded.id`, same as `Subject.id` when `Subject.type`=`user`). */
            user_id?: string;
            /** @description Registered user by slug. */
            user_slug?: string;
        };
        TemplatingOptions: {
            /** Template Repo ID */
            template_id?: string;
        };
        Timezone: {
            iana_timezone?: string;
        };
        TransferCodeAssistWorkplaceBody: {
            occupy_user_id?: string;
            revoke_user_id?: string;
        };
        TreeEntry: {
            /** Name of the file or directory */
            name?: string;
            /** Full path from repository root */
            path?: string;
            type?: components["schemas"]["TreeEntry.Type"];
        };
        /** @enum {string} */
        "TreeEntry.Type": "file" | "executable" | "dir" | "symlink" | "submodule";
        /** @enum {string} */
        TriggerStatus: "already_exists" | "created" | "nothing_to_start";
        UpdateIssueBody: {
            /** Change Assignee, pass empty to clear */
            assignee_id?: string;
            /**
             * User-defined deadline for the issue
             * Format: date-time
             */
            deadline?: string;
            /** Change Issue description (up to 64Kb) */
            description?: string;
            /** Change Milestone, pass empty to clear */
            milestone_id?: string;
            priority?: components["schemas"]["Priority"];
            /** Change Status. System-wide statuses: open, inProgress, paused, closed, declined, duplicate */
            status_slug?: string;
            /** Change Issue title (up to 1024 characters) */
            title?: string;
            visibility?: components["schemas"]["Issue.Visibility"];
        };
        UpdateIssueCommentBody: {
            body?: string;
        };
        UpdateLabelBody: {
            color?: string;
            name?: string;
            slug?: string;
        };
        UpdateMilestoneBody: {
            /** Format: date-time */
            deadline?: string;
            description?: string;
            name?: string;
            slug?: string;
            /** Format: date-time */
            start_date?: string;
            status?: components["schemas"]["Milestone.Status"];
        };
        UpdateProjectBody: {
            description?: string;
            name?: string;
            slug?: string;
            visibility?: components["schemas"]["Project.Visibility"];
            website?: string;
        };
        UpdatePullRequestBody: {
            /** Change Pull Request description (up to 64Kb) */
            description?: string;
            /** Change Pull Request title (up to 1024 characters) */
            title?: string;
        };
        UpdatePullRequestCommentBody: {
            body?: string;
            /** @description Set to true to publish a draft comment. Once published, cannot be unpublished. */
            publish?: boolean;
            resolution_state?: components["schemas"]["ResolutionState"];
        };
        UpdateReleaseBody: {
            release_notes?: string;
            title?: string;
        };
        UpdateRepositoryBody: {
            /** Default Branch. Must be an exisiting branch */
            default_branch?: string;
            /** Description */
            description?: string;
            /** Profile: links */
            links?: components["schemas"]["Link"][];
            /**
             * @description Destination project UUID. Include `project_id` in update_mask to move the
             *     repository; provide an empty value to remove it from its current project.
             */
            project_id?: string;
            template_type?: components["schemas"]["RepoTemplate"];
            visibility?: components["schemas"]["Repository.Visibility"];
        };
        /** UpdateReviewersBody transmits the IDs of those users who need to be added as reviewers */
        UpdateReviewersBody: {
            /**
             * List of reviewers deltas to apply (add or remove)
             *     Each delta must specify action (add/remove) and reviewer reference (by ID)
             */
            reviewers_delta?: components["schemas"]["v1.ReviewerDelta"][];
            silent?: boolean;
        };
        /** UpdateReviewersResponse contains information about all the reviewers of pull request */
        UpdateReviewersResponse: {
            reviewers?: components["schemas"]["PRReviewer"][];
        };
        UpdateTeamBody: {
            description?: string;
            slug?: string;
        };
        UpdateTeamMembersBody: {
            members_delta?: components["schemas"]["TeamMemberDelta"][];
        };
        UpdateTeamMembersResponse: {
            members?: components["schemas"]["TeamMember"][];
        };
        UserEmbedded: {
            /** Id will contain "<external-user>" if user is external */
            id?: string;
            /** Slug will contain "<external-user>" if user is external */
            slug?: string;
        };
        UserProfile: {
            avatar?: components["schemas"]["Image"];
            background_image?: components["schemas"]["Image"];
            bio?: string;
            display_name?: string;
            id?: string;
            links?: components["schemas"]["Link"][];
            location?: components["schemas"]["v1.Location"];
            status?: components["schemas"]["ProfileStatus"];
            timezone?: components["schemas"]["Timezone"];
            username?: string;
            visibility?: components["schemas"]["ProfileVisibility"];
            workplace?: components["schemas"]["Workplace"];
        };
        "v1.Label": {
            author?: components["schemas"]["UserEmbedded"];
            color?: string;
            /** Format: date-time */
            created_at?: string;
            id?: string;
            name?: string;
            slug?: string;
            /** Format: date-time */
            updated_at?: string;
            updated_by?: components["schemas"]["UserEmbedded"];
        };
        "v1.Location": {
            city?: string;
            country?: string;
        };
        "v1.ReviewerDelta": {
            action?: components["schemas"]["DeltaAction"];
            user_id?: string;
        };
        "v1.Tag": {
            author?: components["schemas"]["Signature"];
            author_user?: components["schemas"]["UserEmbedded"];
            commit?: components["schemas"]["Commit"];
            /** Only populated for annotated tags */
            message?: string;
            name?: string;
            signature_verification?: components["schemas"]["SignatureVerification"];
            /**
             * For annotated tags: hash of the tag object
             *     For lightweight tags: hash of the commit
             */
            target?: string;
        };
        Workflow: {
            dates?: components["schemas"]["DatesByStage"];
            description?: string;
            environment_id?: string;
            /** CI/CD entities don't have public IDs at this stage; they will be added later */
            id?: string;
            progress?: components["schemas"]["Progress"];
            /** A name of the workflow as defined in the config */
            slug?: string;
            status?: components["schemas"]["Run.Status"];
            tasks?: components["schemas"]["Task"][];
        };
        WorkflowData: {
            /** @description The name of a workflow to run as defined in the config. */
            name?: string;
            /** @description List of input parameters (name, value pairs) to pass to the workflow. */
            values?: components["schemas"]["InputValue"][];
        };
        /** WorkflowInput message is a list of key-value items to pass as input for workflow run */
        WorkflowInput: {
            values?: components["schemas"]["InputValue"][];
        };
        Workplace: {
            company?: string;
            position?: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: {
        AddOrganizationRolesBody: {
            content: {
                "application/json": components["schemas"]["AddOrganizationRolesBody"];
            };
        };
        AddProjectRolesBody: {
            content: {
                "application/json": components["schemas"]["AddProjectRolesBody"];
            };
        };
        AddRepoRolesBody: {
            content: {
                "application/json": components["schemas"]["AddRepoRolesBody"];
            };
        };
        AutoAssignBody: {
            content: {
                "application/json": components["schemas"]["AutoAssignBody"];
            };
        };
        CreateIssueBody: {
            content: {
                "application/json": components["schemas"]["CreateIssueBody"];
            };
        };
        CreateIssueCommentBody: {
            content: {
                "application/json": components["schemas"]["CreateIssueCommentBody"];
            };
        };
        CreateLabelBody: {
            content: {
                "application/json": components["schemas"]["CreateLabelBody"];
            };
        };
        CreateLinkBody: {
            content: {
                "application/json": components["schemas"]["CreateLinkBody"];
            };
        };
        CreateMilestoneBody: {
            content: {
                "application/json": components["schemas"]["CreateMilestoneBody"];
            };
        };
        CreateOrganizationInvitesBody: {
            content: {
                "application/json": components["schemas"]["CreateOrganizationInvitesBody"];
            };
        };
        CreateProjectBody: {
            content: {
                "application/json": components["schemas"]["CreateProjectBody"];
            };
        };
        CreatePullRequestBody: {
            content: {
                "application/json": components["schemas"]["CreatePullRequestBody"];
            };
        };
        CreatePullRequestCommentBody: {
            content: {
                "application/json": components["schemas"]["CreatePullRequestCommentBody"];
            };
        };
        CreateReleaseBody: {
            content: {
                "application/json": components["schemas"]["CreateReleaseBody"];
            };
        };
        CreateRepositoryBody: {
            content: {
                "application/json": components["schemas"]["CreateRepositoryBody"];
            };
        };
        CreateTeamBody: {
            content: {
                "application/json": components["schemas"]["CreateTeamBody"];
            };
        };
        ForkRepositoryBody: {
            content: {
                "application/json": components["schemas"]["ForkRepositoryBody"];
            };
        };
        GenerateReleaseNotesBody: {
            content: {
                "application/json": components["schemas"]["GenerateReleaseNotesBody"];
            };
        };
        MergePullRequestBody: {
            content: {
                "application/json": components["schemas"]["MergePullRequestBody"];
            };
        };
        ModifyLabelCollectionRequest: {
            content: {
                "application/json": components["schemas"]["ModifyLabelCollectionRequest"];
            };
        };
        ModifyPullRequestCollectionRequest: {
            content: {
                "application/json": components["schemas"]["ModifyPullRequestCollectionRequest"];
            };
        };
        ModifyReactionBody: {
            content: {
                "application/json": components["schemas"]["ModifyReactionBody"];
            };
        };
        OccupyCodeAssistWorkplacesBulkBody: {
            content: {
                "application/json": components["schemas"]["OccupyCodeAssistWorkplacesBulkBody"];
            };
        };
        RateRepositoryBody: {
            content: {
                "application/json": components["schemas"]["RateRepositoryBody"];
            };
        };
        ReleaseCodeAssistWorkplacesBulkBody: {
            content: {
                "application/json": components["schemas"]["ReleaseCodeAssistWorkplacesBulkBody"];
            };
        };
        RemoveOrganizationRolesBody: {
            content: {
                "application/json": components["schemas"]["RemoveOrganizationRolesBody"];
            };
        };
        RemoveProjectRolesBody: {
            content: {
                "application/json": components["schemas"]["RemoveProjectRolesBody"];
            };
        };
        RemoveRepoRolesBody: {
            content: {
                "application/json": components["schemas"]["RemoveRepoRolesBody"];
            };
        };
        RunCIBody: {
            content: {
                "application/json": components["schemas"]["RunCIBody"];
            };
        };
        RunWorkflowsBody: {
            content: {
                "application/json": components["schemas"]["RunWorkflowsBody"];
            };
        };
        SetCodeAssistWorkplacesBody: {
            content: {
                "application/json": components["schemas"]["SetCodeAssistWorkplacesBody"];
            };
        };
        SetDecisionBody: {
            content: {
                "application/json": components["schemas"]["SetDecisionBody"];
            };
        };
        SetSecretBody: {
            content: {
                "application/json": components["schemas"]["SetSecretBody"];
            };
        };
        TransferCodeAssistWorkplaceBody: {
            content: {
                "application/json": components["schemas"]["TransferCodeAssistWorkplaceBody"];
            };
        };
        UpdateIssueBody: {
            content: {
                "application/json": components["schemas"]["UpdateIssueBody"];
            };
        };
        UpdateLabelBody: {
            content: {
                "application/json": components["schemas"]["UpdateLabelBody"];
            };
        };
        UpdateMilestoneBody: {
            content: {
                "application/json": components["schemas"]["UpdateMilestoneBody"];
            };
        };
        UpdateProjectBody: {
            content: {
                "application/json": components["schemas"]["UpdateProjectBody"];
            };
        };
        UpdatePullRequestBody: {
            content: {
                "application/json": components["schemas"]["UpdatePullRequestBody"];
            };
        };
        UpdateReleaseBody: {
            content: {
                "application/json": components["schemas"]["UpdateReleaseBody"];
            };
        };
        UpdateRepositoryBody: {
            content: {
                "application/json": components["schemas"]["UpdateRepositoryBody"];
            };
        };
        UpdateReviewersBody: {
            content: {
                "application/json": components["schemas"]["UpdateReviewersBody"];
            };
        };
        UploadIssueCommentAttachment: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description The file to upload
                     */
                    file: string;
                };
            };
        };
    };
    headers: never;
    pathItems: never;
};
export type $defs = Record<string, never>;
export interface operations {
    DeleteRepositoryDeprecated: {
        parameters: {
            query?: {
                /** @description Flag for deleting without any notifications. NOT IMPLEMENTED YET. */
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateRepositoryDeprecated: {
        parameters: {
            query?: {
                /** @description Flag for update without any notifications. NOT IMPLEMENTED YET. */
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateRepositoryBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RunWorkflow: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
                workflow_name: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RunCIBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunCIWorkflowResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetCubeArtifactsDeprecated: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Cube name as defined in the config. */
                cube_slug: string;
                org_slug: string;
                repo_slug: string;
                run_slug: string;
                /** @description Task name as defined in the config. */
                task_slug: string;
                /** @description Workflow name as defined in the config. */
                workflow_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetCubeArtifactsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetCubeLogsDeprecated: {
        parameters: {
            query?: {
                /**
                 * @description Page number to fetch, by default 1.
                 *
                 *     Logs are split into pages; pages are not guaranteed to be the same size and are intended to be read
                 *     in order. When one page is finished, the subsequent one starts being written.
                 */
                page?: number;
            };
            header?: never;
            path: {
                /** @description Cube name as defined in the config. */
                cube_slug: string;
                org_slug: string;
                repo_slug: string;
                run_slug: string;
                /** @description Task name as defined in the config. */
                task_slug: string;
                /** @description Workflow name as defined in the config. */
                workflow_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetCubeLogsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRunsDeprecated: {
        parameters: {
            query?: {
                /** @description The maximum number of runs to return. The service may return fewer than this value */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRunsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RunWorkflowsDeprecated: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RunWorkflowsBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetRunDeprecated: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
                run_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetWorkflowDeprecated: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
                run_slug: string;
                /** @description Workflow name as defined in the config. */
                workflow_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workflow"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetIssueComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteIssueComment: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateIssueComment: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateIssueCommentBody"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueCommentAttachments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttachmentsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UploadIssueCommentAttachment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UploadIssueCommentAttachment"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Attachment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetIssueCommentAttachment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                attachment_id: string;
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttachmentDownloadable"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteIssueCommentAttachment: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                attachment_id: string;
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddReaction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyReactionBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Reactions"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveReaction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_comment_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyReactionBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Reactions"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteIssueLink: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_link_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListIssueStatusesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetIssueByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Issue"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteIssueByID: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateIssueByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateIssueBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Issue"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueAttachmentsByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttachmentsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetIssueAttachmentByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                attachment_id: string;
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttachmentDownloadable"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteIssueAttachmentByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                attachment_id: string;
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueCommentsByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of issues to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListIssueCommentsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateIssueCommentByID: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateIssueCommentBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueLinksByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of issues to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListLinksResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateIssueLinkByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateLinkBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLink"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLabelsByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReplaceLabelsByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddLabelsByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveLabelsByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLinkedPRsByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLinkedPRsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddLinkedPRsByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyPullRequestCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLinkedPRsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveLinkedPRsByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyPullRequestCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLinkedPRsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLabelByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                label_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["v1.Label"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteLabelByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                label_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateLabelByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                label_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateLabelBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["v1.Label"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssuesAssignedToAuthenticatedUser: {
        parameters: {
            query?: {
                /**
                 * @description Filter using QL language.
                 *
                 *     Supported fields:
                 *     - title: Issue title (string, prefix match)
                 *     - priority: Issue priority (enum: low, normal, high, critical)
                 *     - status: Issue status (enum: open, in_progress, closed)
                 *     - assignee_id: Assignee ID
                 *     - assignee_slug: Assignee username
                 *     - milestone_id: Milestone ID
                 *     - milestone_slug: Milestone slug
                 *     - label_id: Label ID
                 *     - label_slug: Label slug
                 *     - author_id: Author ID
                 *     - author_slug: Author username
                 *     - visibility: Issue visibility (enum: public, private)
                 *     - created_at: Creation timestamp (RFC3339 format)
                 *     - updated_at: Last update timestamp (RFC3339 format)
                 *
                 *     Examples:
                 *     - status=open and priority=critical
                 *     - author_id="550e8400-e29b-41d4-a716-446655440000"
                 *     - created_at>"2024-01-01T00:00:00Z"
                 */
                filter?: string;
                page_size?: string;
                page_token?: string;
                sort_by?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListIssuesAssignedToAuthenticatedUserResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListMyPullRequests: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of pull requests to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /** @description Role by which PRs should be selected: author, reviewer or any */
                role?: "author" | "reviewer" | "any";
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: title, created_at, updated_at
                 */
                sort_by?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepositoryPullRequestsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRatingReactions: {
        parameters: {
            query?: {
                /** @description The maximum number of reactions to return. The service may return fewer than this value. */
                page_size?: string;
                /** @description A page token received from a previous call. Reactions are always ordered by update time descending. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRatingReactionsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMilestoneByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                milestone_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Milestone"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteMilestoneByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                milestone_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateMilestoneByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                milestone_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateMilestoneBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Milestone"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetOrganizationInvitesOperationByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Operation ID */
                operation_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateOrganizationInvitesOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetPullRequestMergeOperationByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Operation ID */
                operation_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MergePullRequestOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetSecretOperationByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Operation ID */
                operation_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecretsOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Organization"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetCodeAssistWorkplaces: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CodeAssistWorkplacesInfo"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    SetCodeAssistWorkplaces: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["SetCodeAssistWorkplacesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOccupiedCodeAssistWorkplaces: {
        parameters: {
            query?: {
                page_size?: string;
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOccupiedCodeAssistWorkplacesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    OccupyCodeAssistWorkplacesBulk: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["OccupyCodeAssistWorkplacesBulkBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReleaseCodeAssistWorkplacesBulk: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ReleaseCodeAssistWorkplacesBulkBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    TransferCodeAssistWorkplace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["TransferCodeAssistWorkplaceBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationInvites: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repositories to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationInvitesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateOrganizationInvites: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateOrganizationInvitesBody"];
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateOrganizationInvitesOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetOrganizationInvite: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invite_id: string;
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Invite"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListMyPersonalQuotas: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListMyPersonalQuotasResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationProjects: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of projects to return. The service may return fewer than
                 *     this value.
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name, slug, org_slug, description, visibility
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationProjectsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateProjectBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                project_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                project_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                project_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateProjectBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListProjectRepositories: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repositories to return. The service may return fewer
                 *     than this value.
                 */
                page_size?: string;
                /** @description A page token received from a previous call. */
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                project_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectRepositoriesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListProjectRoles: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of project roles to return. The service may return fewer than
                 *     this value.
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                project_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddProjectRoles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                project_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AddProjectRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddProjectRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveProjectRoles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                project_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RemoveProjectRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemoveProjectRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListQuotas: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListQuotasResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationRepositories: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repositories to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationRepositoriesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateRepository: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateRepositoryBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationRoles: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of total roles to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddOrganizationRoles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AddOrganizationRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddOrganizationRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveOrganizationRoles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RemoveOrganizationRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemoveOrganizationRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetOrganizationNeurocreditsUsage: {
        parameters: {
            query: {
                /** @description End date in YYYY-MM-DD format. Defaults to today. */
                end_date?: string;
                /**
                 * @description The maximum number of items to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /** @description Start date in YYYY-MM-DD format */
                start_date: string;
            };
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetOrganizationNeurocreditsUsageResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListTeams: {
        parameters: {
            query?: {
                page_size?: string;
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "slug, -members_count"
                 *     Available fields: slug, members_count
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTeamsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateTeamBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Team"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetOrganizationByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Organization"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetCodeAssistWorkplacesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CodeAssistWorkplacesInfo"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    SetCodeAssistWorkplacesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["SetCodeAssistWorkplacesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOccupiedCodeAssistWorkplacesByID: {
        parameters: {
            query?: {
                page_size?: string;
                page_token?: string;
            };
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOccupiedCodeAssistWorkplacesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    OccupyCodeAssistWorkplacesBulkByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["OccupyCodeAssistWorkplacesBulkBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReleaseCodeAssistWorkplacesBulkByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ReleaseCodeAssistWorkplacesBulkBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    TransferCodeAssistWorkplaceByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["TransferCodeAssistWorkplaceBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationInvitesByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repositories to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationInvitesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateOrganizationInvitesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateOrganizationInvitesBody"];
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateOrganizationInvitesOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetOrganizationInviteByOrgID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invite_id: string;
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Invite"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListMyPersonalQuotasByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListMyPersonalQuotasResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationProjectsByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of projects to return. The service may return fewer than
                 *     this value.
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name, slug, org_slug, description, visibility
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationProjectsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateProjectByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateProjectBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListQuotasByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListQuotasResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationRepositoriesByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repositories to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationRepositoriesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateRepositoryByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateRepositoryBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListOrganizationRolesByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of total roles to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListOrganizationRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddOrganizationRolesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AddOrganizationRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddOrganizationRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveOrganizationRolesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RemoveOrganizationRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemoveOrganizationRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetOrganizationNeurocreditsUsageByID: {
        parameters: {
            query: {
                /** @description End date in YYYY-MM-DD format. Defaults to today. */
                end_date?: string;
                /**
                 * @description The maximum number of items to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /** @description Start date in YYYY-MM-DD format */
                start_date: string;
            };
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetOrganizationNeurocreditsUsageResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListTeamsByID: {
        parameters: {
            query?: {
                page_size?: string;
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "slug, -members_count"
                 *     Available fields: slug, members_count
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTeamsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateTeamByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateTeamBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Team"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetProjectByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteProjectByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateProjectByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateProjectBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListProjectRepositoriesByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repositories to return. The service may return fewer
                 *     than this value.
                 */
                page_size?: string;
                /** @description A page token received from a previous call. */
                page_token?: string;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectRepositoriesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListProjectRolesByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of project roles to return. The service may return fewer than
                 *     this value.
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddProjectRolesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AddProjectRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddProjectRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveProjectRolesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RemoveProjectRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemoveProjectRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetPullRequestComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_comment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeletePullRequestComment: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_comment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdatePullRequestComment: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_comment_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdatePullRequestCommentBody"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetPullRequestByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdatePullRequestByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdatePullRequestBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListPullRequestCommentsByID: {
        parameters: {
            query?: {
                iteration?: string;
                /** @description Only drafts (unpublished) comments */
                only_drafts?: boolean;
                /**
                 * @description The maximum number of comments to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: iteration, author_id, parent_id
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPullRequestCommentsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreatePullRequestCommentByID: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreatePullRequestCommentBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    PublishPullRequestCommentsDraftsByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublishPullRequestCommentsDraftsByIDBody"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublishPullRequestCommentsDraftsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    SetDecisionByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["SetDecisionBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SetDecisionResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DiscardPullRequestByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DraftPullRequestByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListPullRequestFilesByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of files to return. The service may return fewer than
                 *     this value.
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPullRequestFilesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetPullRequestLabelsByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReplacePullRequestLabelsByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddPullRequestLabelsByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemovePullRequestLabelsByID: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    MergePullRequestByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["MergePullRequestBody"];
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MergePullRequestOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMergeChecksByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MergeChecks"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    PublishPullRequestByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReopenPullRequestByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListReviewersByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of reviewers to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *
                 *     Available columns: created_at, decision
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListReviewersResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateReviewersByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateReviewersBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateReviewersResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AutoAssignByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                pull_request_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AutoAssignBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AutoAssignResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                release_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                release_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                release_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateReleaseBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddReleaseAssetAttachmentByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                release_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UploadIssueCommentAttachment"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReleaseAsset"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DiscardByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                release_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    PublishByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                release_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DiscoverRepositories: {
        parameters: {
            query?: {
                /**
                 * @description Filter using QL language. An empty filter returns all public repositories.
                 *     Supported field: created_at (repository creation time).
                 *     Supported operators: =, >, >=, <, <=; combine conditions with AND or OR.
                 *     Use parentheses when mixing AND and OR; nested parentheses are not supported.
                 *
                 *     Values can be calendar dates (YYYY-MM-DD), quoted RFC3339 timestamps with a
                 *     timezone, or relative durations (for example, -1h, -7d, -2w, -1m, -1y).
                 *     Calendar dates use UTC: equality selects the whole day, > starts at the next
                 *     day, and <= includes the whole day. Timestamps compare exact instants.
                 *     Relative durations are evaluated at each request; use absolute values to
                 *     keep filter boundaries unchanged while paginating.
                 *
                 *     Examples:
                 *     - created_at >= 2026-01-01 AND created_at < 2026-02-01
                 *     - created_at >= "2026-01-01T12:30:00Z"
                 */
                filter?: string;
                /**
                 * @description The maximum number of repositories to return, up to 100. Defaults to 20 when
                 *     omitted or zero. The service may return fewer than this value.
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. Available fields:
                 *     created_at, rating. Each field defaults to ascending order; prefix it with
                 *     "-" for descending order, for example: "-rating, created_at".
                 *     Redundant space characters are insignificant. Defaults to "-rating".
                 *     Repositories without a rating are placed last in either direction.
                 *     Equal values are ordered by an internal repository ID ascending.
                 *     Use "created_at" or "-created_at" to traverse repositories in an order
                 *     independent of rating changes.
                 */
                sort_by?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DiscoverRepositoriesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetRepository: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteRepository: {
        parameters: {
            query?: {
                /** @description Flag for deleting without any notifications. NOT IMPLEMENTED YET. */
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateRepository: {
        parameters: {
            query?: {
                /** @description Flag for update without any notifications. NOT IMPLEMENTED YET. */
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateRepositoryBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListBranches: {
        parameters: {
            query?: {
                /** @description Filter branches by name contains */
                filter?: string;
                /**
                 * @description The maximum number of branches to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListBranchesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetCubeArtifacts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Cube name as defined in the config. */
                cube_slug: string;
                org_slug: string;
                repo_slug: string;
                run_slug: string;
                /** @description Task name as defined in the config. */
                task_slug: string;
                /** @description Workflow name as defined in the config. */
                workflow_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetCubeArtifactsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetCubeLogs: {
        parameters: {
            query?: {
                /**
                 * @description Page number to fetch, by default 1.
                 *
                 *     Logs are split into pages; pages are not guaranteed to be the same size and are intended to be read
                 *     in order. When one page is finished, the subsequent one starts being written.
                 */
                page?: number;
            };
            header?: never;
            path: {
                /** @description Cube name as defined in the config. */
                cube_slug: string;
                org_slug: string;
                repo_slug: string;
                run_slug: string;
                /** @description Task name as defined in the config. */
                task_slug: string;
                /** @description Workflow name as defined in the config. */
                workflow_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetCubeLogsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRuns: {
        parameters: {
            query?: {
                /** @description The maximum number of runs to return. The service may return fewer than this value */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRunsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RunWorkflows: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RunWorkflowsBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
                run_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetWorkflow: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
                run_slug: string;
                /** @description Workflow name as defined in the config. */
                workflow_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workflow"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListContributors: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of contributors to return. The service may return fewer than
                 *     this value. If unspecified, at most 20 contributors are returned.
                 */
                page_size?: string;
                /**
                 * @description A page token received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match the call that provided
                 *     the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListContributorsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ForkRepository: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ForkRepositoryBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRepositoryIssues: {
        parameters: {
            query?: {
                /**
                 * @description Filter using QL language.
                 *
                 *     Supported fields:
                 *     - title: Issue title (string, prefix match)
                 *     - priority: Issue priority (enum: low, normal, high, critical)
                 *     - status: Issue status (enum: open, in_progress, closed)
                 *     - assignee_id: Assignee ID
                 *     - assignee_slug: Assignee username
                 *     - milestone_id: Milestone ID
                 *     - milestone_slug: Milestone slug
                 *     - label_id: Label ID
                 *     - label_slug: Label slug
                 *     - author_id: Author ID
                 *     - author_slug: Author username
                 *     - visibility: Issue visibility (enum: public, private)
                 *     - created_at: Creation timestamp (RFC3339 format)
                 *     - updated_at: Last update timestamp (RFC3339 format)
                 *
                 *     Examples:
                 *     - status=open and priority=critical
                 *     - author_id="550e8400-e29b-41d4-a716-446655440000"
                 *     - created_at>"2024-01-01T00:00:00Z"
                 */
                filter?: string;
                /**
                 * @description The maximum number of issues to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepositoryIssuesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateIssue: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateIssueBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Issue"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetIssue: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Issue"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteIssue: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateIssue: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateIssueBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Issue"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueAttachments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttachmentsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UploadIssueAttachment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UploadIssueCommentAttachment"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Attachment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetIssueAttachment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                attachment_id: string;
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttachmentDownloadable"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteIssueAttachment: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                attachment_id: string;
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueComments: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of issues to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListIssueCommentsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateIssueComment: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateIssueCommentBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListIssueLinks: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of issues to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListLinksResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateIssueLink: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateLinkBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLink"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLabels: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_slug: string;
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReplaceLabels: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddLabels: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveLabels: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLinkedPRs: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_slug: string;
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLinkedPRsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddLinkedPRs: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyPullRequestCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLinkedPRsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveLinkedPRs: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                issue_slug: string;
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyPullRequestCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssueLinkedPRsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListLabelsForRepository: {
        parameters: {
            query?: {
                filter?: string;
                page_size?: string;
                page_token?: string;
                sort_by?: string;
            };
            header?: never;
            path: {
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListLabelsForRepositoryResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateLabel: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateLabelBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["v1.Label"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLabel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                label_slug: string;
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["v1.Label"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteLabel: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                label_slug: string;
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateLabel: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                label_slug: string;
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateLabelBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["v1.Label"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListMilestonesForRepository: {
        parameters: {
            query?: {
                filter?: string;
                page_size?: string;
                page_token?: string;
                sort_by?: string;
            };
            header?: never;
            path: {
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListMilestonesForRepositoryResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateMilestone: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateMilestoneBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Milestone"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMilestone: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                milestone_slug: string;
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Milestone"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteMilestone: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                milestone_slug: string;
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateMilestone: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                milestone_slug: string;
                /** @description Path parameters for different routes */
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateMilestoneBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Milestone"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRepositoryPullRequests: {
        parameters: {
            query?: {
                /**
                 * @description Filter using QL language.
                 *
                 *     Supported fields:
                 *     - author_id: PR author ID
                 *     - status: PR status (enum: draft, open, discarded, merging, merged)
                 *     - source_branch: Source branch name (string)
                 *     - target_branch: Target branch name (string)
                 *
                 *     Examples:
                 *     - status=open
                 *     - status=open and source_branch="feature/xyz"
                 *     - author_id="550e8400-e29b-41d4-a716-446655440000"
                 */
                filter?: string;
                /**
                 * @description The maximum number of pull requests to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: title, created_at, updated_at
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepositoryPullRequestsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreatePullRequest: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreatePullRequestBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetPullRequest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdatePullRequest: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdatePullRequestBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListPullRequestComments: {
        parameters: {
            query?: {
                iteration?: string;
                /** @description Only drafts (unpublished) comments */
                only_drafts?: boolean;
                /**
                 * @description The maximum number of comments to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: iteration, author_id, parent_id
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPullRequestCommentsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreatePullRequestComment: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreatePullRequestCommentBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestComment"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    PublishPullRequestCommentsDrafts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublishPullRequestCommentsDraftsBody"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublishPullRequestCommentsDraftsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    SetDecision: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["SetDecisionBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SetDecisionResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DiscardPullRequest: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DraftPullRequest: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListPullRequestFiles: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of files to return. The service may return fewer than
                 *     this value.
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPullRequestFilesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetPullRequestLabels: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReplacePullRequestLabels: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddPullRequestLabels: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemovePullRequestLabels: {
        parameters: {
            query?: {
                /** @description creation options (query) */
                silent?: boolean;
            };
            header?: never;
            path: {
                /** @description depending on which route is used, either parent or repoId is filled */
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ModifyLabelCollectionRequest"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequestLabelsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    MergePullRequest: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["MergePullRequestBody"];
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MergePullRequestOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMergeChecks: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MergeChecks"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    PublishPullRequest: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ReopenPullRequest: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListReviewers: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of reviewers to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *
                 *     Available columns: created_at, decision
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListReviewersResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateReviewers: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateReviewersBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateReviewersResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AutoAssign: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                pull_request_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AutoAssignBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AutoAssignResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMyRatingReaction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetMyRatingReactionResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RateRepository: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RateRepositoryBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RateRepositoryResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    List: {
        parameters: {
            query?: {
                /** @description The maximum number of releases to return. The service may return fewer than this value */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: created_at, released_at
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListReleasesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    Create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateReleaseBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GenerateReleaseNotes: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["GenerateReleaseNotesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GenerateReleaseNotesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLatest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetByTag: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                release_tag: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteByTag: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                release_tag: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateByTag: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                release_tag: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateReleaseBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddReleaseAssetAttachment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                release_tag: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description The file to upload
                     */
                    file: string;
                    /** @description The intended name of the asset */
                    name: string;
                };
            };
        };
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReleaseAsset"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DiscardByTag: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                release_tag: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    PublishByTag: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                release_tag: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRepoRoles: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repo roles to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepoRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddRepoRoles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AddRepoRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddRepoRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveRepoRoles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RemoveRepoRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemoveRepoRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListSecrets: {
        parameters: {
            query?: {
                /** @description Optional: filter by specific keys. If empty, all entries are returned. */
                keys?: string[];
                /** @description Optional: name of the secret group. Defaults to "default". */
                secret_group?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListSecretsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    SetSecret: {
        parameters: {
            query?: {
                /** @description Optional: name of the secret group. Defaults to "default". */
                secret_group?: string;
            };
            header?: never;
            path: {
                key: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["SetSecretBody"];
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecretsOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteSecret: {
        parameters: {
            query?: {
                /** @description Optional: name of the secret group. Defaults to "default". */
                secret_group?: string;
            };
            header?: never;
            path: {
                key: string;
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecretsOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListTags: {
        parameters: {
            query?: {
                /** @description Filter tags by name contains */
                filter?: string;
                /**
                 * @description The maximum number of tags to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTagsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListTree: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of tree entries to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /** @description Path within repository to get the tree for. If not specified, returns the root tree */
                path?: string;
                /** @description Whether to retrieve tree entries recursively. If false, only immediate children are returned */
                recursive?: boolean;
                /**
                 * @description Git reference (branch, tag, or commit SHA). If empty, the default branch (usually main) will be used.
                 *     Examples: `mybranch`, `tags:v1.0.0`
                 */
                revision?: string;
            };
            header?: never;
            path: {
                org_slug: string;
                repo_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTreeResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetRepositoryByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteRepositoryByID: {
        parameters: {
            query?: {
                /** @description Flag for deleting without any notifications. NOT IMPLEMENTED YET. */
                silent?: boolean;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateRepositoryByID: {
        parameters: {
            query?: {
                /** @description Flag for update without any notifications. NOT IMPLEMENTED YET. */
                silent?: boolean;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["UpdateRepositoryBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListBranchesByID: {
        parameters: {
            query?: {
                /** @description Filter branches by name contains */
                filter?: string;
                /**
                 * @description The maximum number of branches to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListBranchesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RunWorkflowByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
                workflow_name: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RunCIBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunCIWorkflowResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRunsByID: {
        parameters: {
            query?: {
                /** @description The maximum number of runs to return. The service may return fewer than this value */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRunsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RunWorkflowsByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RunWorkflowsBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListContributorsByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of contributors to return. The service may return fewer than
                 *     this value. If unspecified, at most 20 contributors are returned.
                 */
                page_size?: string;
                /**
                 * @description A page token received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match the call that provided
                 *     the page token.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListContributorsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ForkRepositoryByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["ForkRepositoryBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Repository"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRepositoryIssuesByID: {
        parameters: {
            query?: {
                /**
                 * @description Filter using QL language.
                 *
                 *     Supported fields:
                 *     - title: Issue title (string, prefix match)
                 *     - priority: Issue priority (enum: low, normal, high, critical)
                 *     - status: Issue status (enum: open, in_progress, closed)
                 *     - assignee_id: Assignee ID
                 *     - assignee_slug: Assignee username
                 *     - milestone_id: Milestone ID
                 *     - milestone_slug: Milestone slug
                 *     - label_id: Label ID
                 *     - label_slug: Label slug
                 *     - author_id: Author ID
                 *     - author_slug: Author username
                 *     - visibility: Issue visibility (enum: public, private)
                 *     - created_at: Creation timestamp (RFC3339 format)
                 *     - updated_at: Last update timestamp (RFC3339 format)
                 *
                 *     Examples:
                 *     - status=open and priority=critical
                 *     - author_id="550e8400-e29b-41d4-a716-446655440000"
                 *     - created_at>"2024-01-01T00:00:00Z"
                 */
                filter?: string;
                /**
                 * @description The maximum number of issues to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepositoryIssuesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateIssueByID: {
        parameters: {
            query?: {
                /** @description do not notify subscribers */
                silent?: boolean;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateIssueBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Issue"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListLabelsForRepositoryByID: {
        parameters: {
            query?: {
                filter?: string;
                page_size?: string;
                page_token?: string;
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListLabelsForRepositoryResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateLabelByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateLabelBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["v1.Label"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListMilestonesForRepositoryByID: {
        parameters: {
            query?: {
                filter?: string;
                page_size?: string;
                page_token?: string;
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListMilestonesForRepositoryResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateMilestoneByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateMilestoneBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Milestone"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRepositoryPullRequestsByID: {
        parameters: {
            query?: {
                /**
                 * @description Filter using QL language.
                 *
                 *     Supported fields:
                 *     - author_id: PR author ID
                 *     - status: PR status (enum: draft, open, discarded, merging, merged)
                 *     - source_branch: Source branch name (string)
                 *     - target_branch: Target branch name (string)
                 *
                 *     Examples:
                 *     - status=open
                 *     - status=open and source_branch="feature/xyz"
                 *     - author_id="550e8400-e29b-41d4-a716-446655440000"
                 */
                filter?: string;
                /**
                 * @description The maximum number of pull requests to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: title, created_at, updated_at
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepositoryPullRequestsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreatePullRequestByID: {
        parameters: {
            query?: {
                silent?: boolean;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreatePullRequestBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PullRequest"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMyRatingReactionByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetMyRatingReactionResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RateRepositoryByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RateRepositoryBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RateRepositoryResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListByID: {
        parameters: {
            query?: {
                /** @description The maximum number of releases to return. The service may return fewer than this value */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: created_at, released_at
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListReleasesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    CreateByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["CreateReleaseBody"];
        responses: {
            /** @description A successful response. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GenerateReleaseNotesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["GenerateReleaseNotesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GenerateReleaseNotesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetLatestByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Release"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListRepoRolesByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of repo roles to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepoRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    AddRepoRolesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["AddRepoRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddRepoRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    RemoveRepoRolesByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RemoveRepoRolesBody"];
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemoveRepoRolesResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListSecretsByRepoID: {
        parameters: {
            query?: {
                /** @description Optional: filter by specific keys. If empty, all entries are returned. */
                keys?: string[];
                /** @description Optional: name of the secret group. Defaults to "default". */
                secret_group?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListSecretsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    SetSecretByRepoID: {
        parameters: {
            query?: {
                /** @description Optional: name of the secret group. Defaults to "default". */
                secret_group?: string;
            };
            header?: never;
            path: {
                key: string;
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["SetSecretBody"];
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecretsOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteSecretByRepoID: {
        parameters: {
            query?: {
                /** @description Optional: name of the secret group. Defaults to "default". */
                secret_group?: string;
            };
            header?: never;
            path: {
                key: string;
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecretsOperation"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListTagsByID: {
        parameters: {
            query?: {
                /** @description Filter tags by name contains */
                filter?: string;
                /**
                 * @description The maximum number of tags to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /**
                 * @description Ordering options: comma separated list of fields.
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "foo, -bar"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: name
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTagsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListTreeByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of tree entries to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /** @description Path within repository to get the tree for. If not specified, returns the root tree */
                path?: string;
                /** @description Whether to retrieve tree entries recursively. If false, only immediate children are returned */
                recursive?: boolean;
                /**
                 * @description Git reference (branch, tag, or commit SHA). If empty, the default branch (usually main) will be used.
                 *     Examples: `mybranch`, `tags:v1.0.0`
                 */
                revision?: string;
            };
            header?: never;
            path: {
                repo_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTreeResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetTeamByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                team_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Team"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    DeleteTeamByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                team_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateTeamByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                team_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTeamBody"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Team"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListTeamMembersByID: {
        parameters: {
            query?: {
                page_size?: string;
                page_token?: string;
            };
            header?: never;
            path: {
                team_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTeamMembersResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    UpdateTeamMembersByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                team_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTeamMembersBody"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateTeamMembersResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMyProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserProfile"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetMyCodeAssistBillingOrg: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Organization"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserProfile"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListUserPullRequests: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of pull requests to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /** @description Role by which PRs should be selected: author, reviewer or any */
                role?: "author" | "reviewer" | "any";
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: title, created_at, updated_at
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                user_slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepositoryPullRequestsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetProfileByCloudID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                cloud_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserProfile"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    GetProfileByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserProfile"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    ListUserPullRequestsByID: {
        parameters: {
            query?: {
                /**
                 * @description The maximum number of pull requests to return. The service may return fewer than
                 *     this value
                 */
                page_size?: string;
                /**
                 * @description A page token, received from a previous call.
                 *     Provide this to retrieve the subsequent page.
                 *
                 *     When paginating, all other parameters must match
                 *     the call that provided the page token.
                 */
                page_token?: string;
                /** @description Role by which PRs should be selected: author, reviewer or any */
                role?: "author" | "reviewer" | "any";
                /**
                 * @description Ordering options: comma separated list of fields. For example: "name, created_at"
                 *     Default sorting order is ascending. To specify descending order for a field,
                 *     append a "-" prefix; for example: "name, -created_at"
                 *     Redundant space characters in the syntax are insignificant. "foo, -bar", " foo , -bar", and "foo,bar"
                 *     are all equivalent.
                 *     Available fields: title, created_at, updated_at
                 */
                sort_by?: string;
            };
            header?: never;
            path: {
                user_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRepositoryPullRequestsResponse"];
                };
            };
            /** @description Both Client Errors (4xx) and Server Errors (5xx) are serialized into this scheme */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
}
