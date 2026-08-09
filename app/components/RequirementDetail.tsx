import { ChangeEvent } from 'react';
import { complianceOptions, MAX_UPLOAD_BYTES } from '../lib/config';
import { isAnswerComplete } from '../lib/scoring';
import type {
  Account,
  CatalogueItem,
  CategorySubmission,
  RequirementAnswer,
  ResponseTab,
  ReviewStatus,
} from '../lib/types';

type RequirementDetailProps = {
  account: Account;
  selectedCategory: string;
  categoryRequirements: CatalogueItem[];
  selectedRequirement: CatalogueItem;
  selectedIndex: number;
  currentAnswer: RequirementAnswer;
  activeTab: ResponseTab;
  commentDraft: string;
  categorySubmission?: CategorySubmission;
  onSetActiveTab: (tab: ResponseTab) => void;
  onSetCommentDraft: (value: string) => void;
  onUpdateAnswer: (patch: Partial<RequirementAnswer>) => void;
  onUploadEvidence: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmitCategory: () => void;
  onGoToRequirement: (offset: number) => void;
  onJumpToNextIncomplete: () => void;
  onAddComment: () => void;
  onChangeReviewStatus: (status: ReviewStatus) => void;
};

export function RequirementDetail({
  account,
  selectedCategory,
  categoryRequirements,
  selectedRequirement,
  selectedIndex,
  currentAnswer,
  activeTab,
  commentDraft,
  categorySubmission,
  onSetActiveTab,
  onSetCommentDraft,
  onUpdateAnswer,
  onUploadEvidence,
  onSubmitCategory,
  onGoToRequirement,
  onJumpToNextIncomplete,
  onAddComment,
  onChangeReviewStatus,
}: RequirementDetailProps) {
  return (
    <>
      <div className="canvasTop">
        <div className="crumbGroup">
          <span className="navCrumb">
            <b>{selectedCategory}</b> · Question {selectedIndex + 1} of {categoryRequirements.length}
          </span>
          <em
            className={`categoryStatusChip ${(categorySubmission?.status ?? 'Draft')
              .toLowerCase()
              .replaceAll(' ', '-')}`}
          >
            {categorySubmission?.status ?? 'Draft'}
          </em>
        </div>
        <div className="canvasTopActions">
          <button className="submitCategoryBtn" onClick={onSubmitCategory}>
            {categorySubmission?.status === 'Submitted' || categorySubmission?.status === 'Approved'
              ? 'Resubmit category'
              : 'Submit category'}
          </button>
          <div className="navArrows">
            <button
              disabled={selectedIndex === 0}
              onClick={() => onGoToRequirement(-1)}
              aria-label="Previous requirement"
            >
              ←
            </button>
            <button
              disabled={selectedIndex === categoryRequirements.length - 1}
              onClick={() => onGoToRequirement(1)}
              aria-label="Next requirement"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="questionBody">
        <div className="reqQuote">
          <span>Requirement</span>
          <p>{selectedRequirement.description}</p>
        </div>
        <div className="qHeadRow">
          <h1>{selectedRequirement.name}</h1>
          <div className="tagRow">
            <span className={`tag ${selectedRequirement.priority.toLowerCase()}`}>
              {selectedRequirement.priority}
            </span>
            <span className="tag type">{selectedRequirement.type}</span>
          </div>
        </div>
        <p className="reqId">{selectedRequirement.id}</p>

        <div className="quickStrip">
          <fieldset className="quickField">
            <legend>
              Level of compliance
              <small>
                Select the statement that most accurately reflects the solution&apos;s current capability.
              </small>
            </legend>
            <div className="pillGroup">
              {complianceOptions.map((option, index) => (
                <label
                  key={option.value}
                  className={`pill ${currentAnswer.compliance === option.value ? 'checked' : ''}`}
                  title={option.description}
                >
                  <input
                    type="radio"
                    name={`compliance-${selectedRequirement.id}`}
                    checked={currentAnswer.compliance === option.value}
                    onChange={() => onUpdateAnswer({ compliance: option.value })}
                  />
                  <kbd>{index + 1}</kbd>
                  {option.value}
                  <span className="score">{option.score}pt</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="quickField">
            <legend>
              Operating mode
              <small>Select how this capability operates.</small>
            </legend>
            <div className="pillGroup">
              {(['Online', 'Offline', 'Both'] as const).map((mode) => (
                <label
                  key={mode}
                  className={`pill ${currentAnswer.mode === mode ? 'checked' : ''}`}
                >
                  <input
                    type="radio"
                    name={`mode-${selectedRequirement.id}`}
                    checked={currentAnswer.mode === mode}
                    onChange={() => onUpdateAnswer({ mode })}
                  />
                  {mode}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="quickField">
            <legend>
              Is this dependent on other systems?
              <small>Indicate whether external systems are needed to fulfil the requirement.</small>
            </legend>
            <div className="pillGroup">
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map((choice) => (
                <label
                  key={choice.label}
                  className={`pill ${currentAnswer.dependsOnOtherSystems === choice.value ? 'checked' : ''}`}
                >
                  <input
                    type="radio"
                    name={`dependency-${selectedRequirement.id}`}
                    checked={currentAnswer.dependsOnOtherSystems === choice.value}
                    onChange={() =>
                      onUpdateAnswer({
                        dependsOnOtherSystems: choice.value,
                        ...(choice.value ? {} : { dependentSystems: '' }),
                      })
                    }
                  />
                  {choice.label}
                </label>
              ))}
            </div>
            {currentAnswer.dependsOnOtherSystems && (
              <div className="dependsWrap">
                <small>List each system needed to fulfil this requirement.</small>
                <textarea
                  value={currentAnswer.dependentSystems}
                  onChange={(event) => onUpdateAnswer({ dependentSystems: event.target.value })}
                  placeholder={'e.g. National ID System\nPayment Gateway\nSMS Gateway'}
                  rows={3}
                />
              </div>
            )}
          </fieldset>
        </div>

        <div className="tabBar">
          <button className={activeTab === 'response' ? 'active' : ''} onClick={() => onSetActiveTab('response')}>
            Evidence &amp; notes
          </button>
          <button className={activeTab === 'review' ? 'active' : ''} onClick={() => onSetActiveTab('review')}>
            Review
            {currentAnswer.reviewStatus !== 'Not Reviewed' && (
              <span className={`warnDot ${currentAnswer.reviewStatus === 'Approved' ? 'approved' : 'changes'}`} />
            )}
          </button>
          <button className={activeTab === 'discussion' ? 'active' : ''} onClick={() => onSetActiveTab('discussion')}>
            Discussion <span className="badge">{currentAnswer.comments.length}</span>
          </button>
        </div>

        <div className={`tabPanel ${activeTab === 'response' ? 'active' : ''}`}>
          <label className="systemsField evidenceField">
            <span>
              Evidence <em>Provide wherever possible</em>
            </span>
            <small>
              Add screenshots, system documentation, demonstrations, configuration guides, API specifications, or deployment references.
            </small>
            <textarea
              value={currentAnswer.evidence}
              onChange={(event) => onUpdateAnswer({ evidence: event.target.value })}
              placeholder="Describe the evidence or paste links to supporting documentation"
              rows={4}
            />
          </label>

          <div className="documentEvidence">
            <div>
              <b>Supporting documents</b>
              <small>
                PDF, Word, Excel, images, or other supporting files up to {Math.round(MAX_UPLOAD_BYTES / 100000) / 10} MB each.
              </small>
            </div>
            <label className="uploadButton">
              ＋ Upload documents
              <input type="file" multiple onChange={onUploadEvidence} />
            </label>
            {currentAnswer.attachments.length > 0 && (
              <div className="attachmentList">
                {currentAnswer.attachments.map((attachment) => (
                  <div key={attachment.id}>
                    <span>▤</span>
                    <a href={attachment.dataUrl} download={attachment.name}>
                      <b>{attachment.name}</b>
                      <small>
                        {Math.max(1, Math.round(attachment.size / 1024))} KB ·{' '}
                        {new Date(attachment.uploadedAt).toLocaleDateString()}
                      </small>
                    </a>
                    <button
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() =>
                        onUpdateAnswer({
                          attachments: currentAnswer.attachments.filter(
                            (entry) => entry.id !== attachment.id,
                          ),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="systemsField">
            <span>Assumptions and notes</span>
            <small>Capture implementation assumptions, constraints, and clarifications for reviewers.</small>
            <textarea
              value={currentAnswer.notes}
              onChange={(event) => onUpdateAnswer({ notes: event.target.value })}
              placeholder="Add implementation notes, assumptions, or clarifications"
              rows={4}
            />
          </label>
        </div>

        <div className={`tabPanel ${activeTab === 'review' ? 'active' : ''}`}>
          {!categorySubmission || categorySubmission.status === 'Draft' ? (
            <div className="reviewLocked">
              Submit <b>{selectedCategory}</b> before reviewing its requirements.
              Reviewer decisions apply once every requirement in the category has a complete response.
            </div>
          ) : (
            <div className="reviewCard">
              <div className="reviewChoice">
                <button
                  className={`approve ${currentAnswer.reviewStatus === 'Approved' ? 'active' : ''}`}
                  onClick={() => onChangeReviewStatus('Approved')}
                >
                  ✓ Approve
                </button>
                <button
                  className={`request ${currentAnswer.reviewStatus === 'Changes Requested' ? 'active' : ''}`}
                  onClick={() => onChangeReviewStatus('Changes Requested')}
                >
                  ↺ Request changes
                </button>
                {currentAnswer.reviewStatus !== 'Not Reviewed' && (
                  <button className="resetReview" onClick={() => onChangeReviewStatus('Not Reviewed')}>
                    Reset
                  </button>
                )}
              </div>
              <label>
                Reviewer feedback
                <textarea
                  value={currentAnswer.reviewFeedback}
                  onChange={(event) => onUpdateAnswer({ reviewFeedback: event.target.value })}
                  placeholder="Explain what should be changed or provide review feedback"
                  rows={3}
                />
              </label>
            </div>
          )}
        </div>

        <div className={`tabPanel ${activeTab === 'discussion' ? 'active' : ''}`}>
          <div className="commentList">
            {currentAnswer.comments.length === 0 && (
              <p>No discussion yet. Start a conversation about this requirement.</p>
            )}
            {currentAnswer.comments.map((comment) => (
              <article key={comment.id}>
                <div className="commentAvatar">
                  {comment.author
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <b>
                    {comment.author}
                    <em>{comment.role}</em>
                  </b>
                  <small>{new Date(comment.createdAt).toLocaleString()}</small>
                  <p>{comment.message}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="commentComposer">
            <textarea
              value={commentDraft}
              onChange={(event) => onSetCommentDraft(event.target.value)}
              placeholder={`Add a comment as ${account.name}`}
              rows={3}
            />
            <button disabled={!commentDraft.trim()} onClick={onAddComment}>
              Post comment
            </button>
          </div>
        </div>
      </div>

      <div className="canvasFoot">
        <button className="previous" disabled={selectedIndex === 0} onClick={() => onGoToRequirement(-1)}>
          ← Previous
        </button>
        <span>{isAnswerComplete(currentAnswer) ? 'Response complete' : 'Complete all required fields'}</span>
        <div className="footBtns">
          <button className="jumpIncomplete" onClick={onJumpToNextIncomplete}>
            Next incomplete →
          </button>
          <button
            className="nextQuestion"
            disabled={selectedIndex === categoryRequirements.length - 1}
            onClick={() => onGoToRequirement(1)}
          >
            Next requirement →
          </button>
        </div>
      </div>
    </>
  );
}
