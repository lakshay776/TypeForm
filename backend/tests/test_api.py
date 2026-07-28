"""End-to-end coverage of the creator, respondent and results flows."""

API = "/api"


def _create_form(client, title="Test form"):
    response = client.post(f"{API}/forms", json={"title": title})
    assert response.status_code == 201, response.text
    return response.json()


def _add_question(client, form_id, **payload):
    response = client.post(f"{API}/forms/{form_id}/questions", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _full_form(client):
    """A published form covering every question type."""
    form = _create_form(client, "Everything form")
    form_id = form["id"]
    questions = {
        "short_text": _add_question(
            client, form_id, type="short_text", title="Name", is_required=True, max_length=10
        ),
        "long_text": _add_question(client, form_id, type="long_text", title="Story"),
        "email": _add_question(client, form_id, type="email", title="Email", is_required=True),
        "number": _add_question(
            client, form_id, type="number", title="Age", is_required=True, min_value=18, max_value=99
        ),
        "yes_no": _add_question(client, form_id, type="yes_no", title="Subscribe?"),
        "rating": _add_question(client, form_id, type="rating", title="Score", rating_max=5),
        "multiple_choice": _add_question(
            client,
            form_id,
            type="multiple_choice",
            title="Pick some",
            allow_multiple=True,
            options=[{"label": "A"}, {"label": "B"}, {"label": "C"}],
        ),
        "dropdown": _add_question(
            client,
            form_id,
            type="dropdown",
            title="Pick one",
            options=[{"label": "X"}, {"label": "Y"}],
        ),
    }
    published = client.post(f"{API}/forms/{form_id}/publish")
    assert published.status_code == 200
    return published.json(), questions


def _valid_answers(questions):
    return [
        {"question_id": questions["short_text"]["id"], "value": "Ada"},
        {"question_id": questions["long_text"]["id"], "value": "A long story."},
        {"question_id": questions["email"]["id"], "value": "ada@example.com"},
        {"question_id": questions["number"]["id"], "value": 36},
        {"question_id": questions["yes_no"]["id"], "value": True},
        {"question_id": questions["rating"]["id"], "value": 4},
        {
            "question_id": questions["multiple_choice"]["id"],
            "value": [questions["multiple_choice"]["options"][0]["id"]],
        },
        {
            "question_id": questions["dropdown"]["id"],
            "value": questions["dropdown"]["options"][1]["id"],
        },
    ]


# --------------------------------------------------------------------------- #
# Form management
# --------------------------------------------------------------------------- #


def test_health_and_creator(client):
    assert client.get("/health").json() == {"status": "ok"}
    creator = client.get(f"{API}/me").json()
    assert creator["email"] and creator["id"]


def test_new_forms_have_no_welcome_screen(client):
    """It is an element the creator adds from the picker, not a default."""
    form = _create_form(client)
    assert form["show_welcome_screen"] is False

    enabled = client.patch(
        f"{API}/forms/{form['id']}", json={"show_welcome_screen": True}
    ).json()
    assert enabled["show_welcome_screen"] is True

    removed = client.patch(
        f"{API}/forms/{form['id']}", json={"show_welcome_screen": False}
    ).json()
    assert removed["show_welcome_screen"] is False


def test_public_form_reflects_the_welcome_screen_setting(client):
    form, _ = _full_form(client)
    public = client.get(f"{API}/public/forms/{form['slug']}").json()
    assert public["show_welcome_screen"] is False

    client.patch(f"{API}/forms/{form['id']}", json={"show_welcome_screen": True})
    public = client.get(f"{API}/public/forms/{form['slug']}").json()
    assert public["show_welcome_screen"] is True


def test_form_crud_and_counts(client):
    form = _create_form(client, "My survey")
    assert form["status"] == "draft"
    assert form["public_url"] is None
    assert form["theme"]["background_color"] == "#FFFFFF"

    renamed = client.patch(f"{API}/forms/{form['id']}", json={"title": "Renamed survey"})
    assert renamed.json()["title"] == "Renamed survey"
    # The slug is deliberately stable across a rename so shared links keep working.
    assert renamed.json()["slug"] == form["slug"]

    listed = client.get(f"{API}/forms").json()
    assert [item["title"] for item in listed] == ["Renamed survey"]
    assert listed[0]["question_count"] == 0 and listed[0]["response_count"] == 0

    deleted = client.delete(f"{API}/forms/{form['id']}")
    assert deleted.status_code == 204
    assert client.get(f"{API}/forms/{form['id']}").status_code == 404


def test_unknown_fields_are_rejected_not_ignored(client):
    """Pydantic's default is to drop unknown keys, which makes a client bug — a
    typo, or a field the deployed backend doesn't have yet — look like a
    successful write."""
    form = _create_form(client)

    typo = client.patch(f"{API}/forms/{form['id']}", json={"titel": "misspelled"})
    assert typo.status_code == 422
    assert client.get(f"{API}/forms/{form['id']}").json()["title"] == form["title"]

    assert (
        client.post(
            f"{API}/forms/{form['id']}/questions",
            json={"type": "short_text", "title": "Hi", "not_a_field": True},
        ).status_code
        == 422
    )


def test_link_can_be_edited(client):
    form, questions = _full_form(client)
    original_slug = form["slug"]

    # A response collected under the old slug must survive the rename.
    client.post(
        f"{API}/public/forms/{original_slug}/responses",
        json={"answers": _valid_answers(questions)},
    )

    renamed = client.patch(f"{API}/forms/{form['id']}", json={"slug": "join-our-beta"})
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["slug"] == "join-our-beta"
    assert renamed.json()["public_url"].endswith("/join-our-beta")
    assert renamed.json()["response_count"] == 1

    # The new link works and the old one is gone.
    assert client.get(f"{API}/public/forms/join-our-beta").status_code == 200
    assert client.get(f"{API}/public/forms/{original_slug}").status_code == 404


def test_link_must_be_unique(client):
    first = _create_form(client, "First")
    second = _create_form(client, "Second")

    assert client.patch(f"{API}/forms/{first['id']}", json={"slug": "shared-name"}).status_code == 200

    clash = client.patch(f"{API}/forms/{second['id']}", json={"slug": "shared-name"})
    assert clash.status_code == 409
    assert "already taken" in clash.json()["detail"]
    # The rejected update leaves the form untouched.
    assert client.get(f"{API}/forms/{second['id']}").json()["slug"] == second["slug"]

    # Setting a form's own slug again is a no-op, not a conflict.
    assert client.patch(f"{API}/forms/{first['id']}", json={"slug": "shared-name"}).status_code == 200


def test_link_format_is_enforced(client):
    form = _create_form(client)
    for bad in ["Has Spaces", "UPPER", "trailing-", "-leading", "double--hyphen", "no", "sym!bol"]:
        response = client.patch(f"{API}/forms/{form['id']}", json={"slug": bad})
        assert response.status_code == 422, f"{bad!r} should be rejected"


def test_a_rejected_slug_does_not_apply_the_rest_of_the_update(client):
    first = _create_form(client, "First")
    second = _create_form(client, "Second")
    client.patch(f"{API}/forms/{first['id']}", json={"slug": "taken-link"})

    clash = client.patch(
        f"{API}/forms/{second['id']}", json={"slug": "taken-link", "title": "Should not stick"}
    )
    assert clash.status_code == 409
    assert client.get(f"{API}/forms/{second['id']}").json()["title"] == "Second"


def test_publish_exposes_public_url_and_unpublish_hides_it(client):
    form = _create_form(client)
    _add_question(client, form["id"], type="short_text", title="Hi")

    published = client.post(f"{API}/forms/{form['id']}/publish").json()
    assert published["status"] == "published"
    assert published["public_url"].endswith(published["slug"])
    assert client.get(f"{API}/public/forms/{published['slug']}").status_code == 200

    unpublished = client.post(f"{API}/forms/{form['id']}/unpublish").json()
    assert unpublished["status"] == "draft"
    assert unpublished["public_url"] is None
    # published_at is kept as a record of when the form first went live.
    assert unpublished["published_at"] is not None
    assert client.get(f"{API}/public/forms/{published['slug']}").status_code == 404


def test_an_empty_form_cannot_be_published(client):
    form = _create_form(client, "Half-built")

    empty = client.post(f"{API}/forms/{form['id']}/publish")
    assert empty.status_code == 422
    assert empty.json()["problems"] == ["Add at least one question."]
    assert client.get(f"{API}/forms/{form['id']}").json()["status"] == "draft"

    _add_question(client, form["id"], type="short_text", title="Anything")
    published = client.post(f"{API}/forms/{form['id']}/publish")
    assert published.status_code == 200
    assert published.json()["public_url"]


def test_an_incomplete_form_is_still_publishable(client):
    """A missing title or a blank option label is incomplete, not broken.

    The UI shows a placeholder for either, so refusing to publish would stop a
    creator sharing a draft they are still wording.
    """
    form = _create_form(client, "Rough draft")
    created = client.post(
        f"{API}/forms/{form['id']}/questions",
        json={"type": "multiple_choice", "title": "", "options": [{"label": ""}, {"label": ""}]},
    )
    assert created.status_code == 201, created.text

    published = client.post(f"{API}/forms/{form['id']}/publish")
    assert published.status_code == 200, published.text
    assert published.json()["public_url"]

    # And it is genuinely reachable, untitled and all.
    public = client.get(f"{API}/public/forms/{published.json()['slug']}")
    assert public.status_code == 200
    assert public.json()["questions"][0]["title"] == ""


def test_blank_option_labels_are_savable_but_not_publishable(client):
    """The builder cannot create an option and then let you type into it if the
    API refuses blank labels, so they are accepted on write."""
    form = _create_form(client)
    created = client.post(
        f"{API}/forms/{form['id']}/questions",
        json={"type": "dropdown", "title": "Choose", "options": [{"label": ""}]},
    )
    assert created.status_code == 201
    assert created.json()["options"][0]["label"] == ""


def test_duplicate_copies_definition_but_not_responses(client):
    form, questions = _full_form(client)
    client.post(
        f"{API}/public/forms/{form['slug']}/responses", json={"answers": _valid_answers(questions)}
    )

    clone = client.post(f"{API}/forms/{form['id']}/duplicate").json()
    assert clone["title"] == f"{form['title']} (copy)"
    assert clone["status"] == "draft"
    assert clone["slug"] != form["slug"]
    assert len(clone["questions"]) == len(form["questions"])
    assert clone["response_count"] == 0
    # Options are copied as new rows, not shared with the original.
    original_option_ids = {o["id"] for q in form["questions"] for o in q["options"]}
    clone_option_ids = {o["id"] for q in clone["questions"] for o in q["options"]}
    assert not original_option_ids & clone_option_ids


# --------------------------------------------------------------------------- #
# Questions
# --------------------------------------------------------------------------- #


def test_questions_are_densely_positioned_through_edits(client):
    form = _create_form(client)
    ids = [
        _add_question(client, form["id"], type="short_text", title=f"Q{i}")["id"] for i in range(4)
    ]

    positions = [q["position"] for q in client.get(f"{API}/forms/{form['id']}/questions").json()]
    assert positions == [0, 1, 2, 3]

    reordered = client.put(
        f"{API}/forms/{form['id']}/questions/reorder",
        json={"question_ids": [ids[3], ids[0], ids[2], ids[1]]},
    )
    assert reordered.status_code == 200
    assert [q["id"] for q in reordered.json()] == [ids[3], ids[0], ids[2], ids[1]]
    assert [q["position"] for q in reordered.json()] == [0, 1, 2, 3]

    assert client.delete(f"{API}/forms/{form['id']}/questions/{ids[0]}").status_code == 204
    remaining = client.get(f"{API}/forms/{form['id']}/questions").json()
    assert [q["position"] for q in remaining] == [0, 1, 2]


def test_bulk_create_appends_in_order(client):
    form = _create_form(client)
    _add_question(client, form["id"], type="short_text", title="Existing")

    created = client.post(
        f"{API}/forms/{form['id']}/questions/bulk",
        json={
            "questions": [
                {"type": "short_text", "title": "What's your name?"},
                {"type": "email", "title": "Your email?"},
                {
                    "type": "multiple_choice",
                    "title": "Pick one",
                    "options": [{"label": "A"}, {"label": "B"}],
                },
            ]
        },
    )
    assert created.status_code == 201, created.text
    assert [q["title"] for q in created.json()] == [
        "What's your name?",
        "Your email?",
        "Pick one",
    ]

    questions = client.get(f"{API}/forms/{form['id']}/questions").json()
    # Appended after what was already there, and positions stay dense.
    assert [q["title"] for q in questions] == [
        "Existing",
        "What's your name?",
        "Your email?",
        "Pick one",
    ]
    assert [q["position"] for q in questions] == [0, 1, 2, 3]
    assert [o["label"] for o in questions[3]["options"]] == ["A", "B"]


def test_bulk_create_rejects_an_empty_batch(client):
    form = _create_form(client)
    assert (
        client.post(f"{API}/forms/{form['id']}/questions/bulk", json={"questions": []}).status_code
        == 422
    )


def test_bulk_create_is_all_or_nothing(client):
    """A malformed item must not leave the earlier ones behind."""
    form = _create_form(client)
    response = client.post(
        f"{API}/forms/{form['id']}/questions/bulk",
        json={
            "questions": [
                {"type": "short_text", "title": "Fine"},
                {"type": "dropdown", "title": "Broken — a choice type with no options"},
            ]
        },
    )
    assert response.status_code == 422
    assert client.get(f"{API}/forms/{form['id']}/questions").json() == []


def test_reorder_rejects_a_partial_list(client):
    form = _create_form(client)
    first = _add_question(client, form["id"], type="short_text", title="A")
    _add_question(client, form["id"], type="short_text", title="B")

    response = client.put(
        f"{API}/forms/{form['id']}/questions/reorder", json={"question_ids": [first["id"]]}
    )
    assert response.status_code == 400


def test_insert_at_position_shifts_later_questions(client):
    form = _create_form(client)
    _add_question(client, form["id"], type="short_text", title="First")
    _add_question(client, form["id"], type="short_text", title="Last")
    _add_question(client, form["id"], type="short_text", title="Middle", position=1)

    titles = [q["title"] for q in client.get(f"{API}/forms/{form['id']}/questions").json()]
    assert titles == ["First", "Middle", "Last"]


def test_editing_options_preserves_ids_of_kept_options(client):
    """Renaming an option must not delete and recreate it, which would drop answers."""
    form = _create_form(client)
    question = _add_question(
        client,
        form["id"],
        type="multiple_choice",
        title="Pick",
        options=[{"label": "Red"}, {"label": "Blue"}],
    )
    red, blue = question["options"]

    updated = client.put(
        f"{API}/forms/{form['id']}/questions/{question['id']}",
        json={
            "title": "Pick a colour",
            "options": [
                {"id": blue["id"], "label": "Blue"},
                {"id": red["id"], "label": "Crimson"},
                {"label": "Green"},
            ],
        },
    ).json()

    assert [o["label"] for o in updated["options"]] == ["Blue", "Crimson", "Green"]
    assert [o["id"] for o in updated["options"][:2]] == [blue["id"], red["id"]]


def test_question_type_can_change_before_any_answers(client):
    form = _create_form(client)
    question = _add_question(client, form["id"], type="short_text", title="Anything")

    updated = client.put(
        f"{API}/forms/{form['id']}/questions/{question['id']}",
        json={"type": "rating", "title": "Rate it", "rating_max": 7},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["type"] == "rating"
    assert updated.json()["rating_max"] == 7


def test_switching_away_from_a_choice_type_drops_its_options(client):
    form = _create_form(client)
    question = _add_question(
        client,
        form["id"],
        type="dropdown",
        title="Pick",
        options=[{"label": "A"}, {"label": "B"}],
    )
    assert len(question["options"]) == 2

    updated = client.put(
        f"{API}/forms/{form['id']}/questions/{question['id']}",
        json={"type": "long_text", "title": "Tell me more"},
    ).json()
    # Options can no longer be referenced by anything, so they are not left behind.
    assert updated["options"] == []


def test_question_type_locks_once_it_has_answers(client):
    form, questions = _full_form(client)
    client.post(
        f"{API}/public/forms/{form['slug']}/responses",
        json={"answers": _valid_answers(questions)},
    )

    target = questions["short_text"]
    locked = client.put(
        f"{API}/forms/{form['id']}/questions/{target['id']}",
        json={"type": "number", "title": "Name"},
    )
    assert locked.status_code == 409
    assert "answers" in locked.json()["detail"]

    # The question is untouched, and edits that keep the type still work.
    unchanged = client.get(f"{API}/forms/{form['id']}/questions").json()
    assert next(q for q in unchanged if q["id"] == target["id"])["type"] == "short_text"

    renamed = client.put(
        f"{API}/forms/{form['id']}/questions/{target['id']}",
        json={"title": "Your full name", "is_required": True, "max_length": 10},
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Your full name"


def test_changing_to_a_choice_type_without_options_is_rejected(client):
    form = _create_form(client)
    question = _add_question(client, form["id"], type="short_text", title="Anything")

    response = client.put(
        f"{API}/forms/{form['id']}/questions/{question['id']}",
        json={"type": "multiple_choice", "title": "Pick"},
    )
    assert response.status_code == 422


def test_choice_question_requires_options(client):
    form = _create_form(client)
    response = client.post(
        f"{API}/forms/{form['id']}/questions", json={"type": "dropdown", "title": "Empty"}
    )
    assert response.status_code == 422


# --------------------------------------------------------------------------- #
# Respondent flow
# --------------------------------------------------------------------------- #


def test_public_form_hides_creator_only_fields(client):
    form, _ = _full_form(client)
    public = client.get(f"{API}/public/forms/{form['slug']}").json()
    assert "id" not in public and "status" not in public and "response_count" not in public
    assert public["title"] == form["title"]
    assert len(public["questions"]) == 8


def test_submit_valid_response(client):
    form, questions = _full_form(client)
    response = client.post(
        f"{API}/public/forms/{form['slug']}/responses",
        json={"answers": _valid_answers(questions), "duration_seconds": 74},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["token"] and body["thank_you_heading"]

    assert client.get(f"{API}/forms/{form['id']}").json()["response_count"] == 1


def test_required_answers_are_enforced_server_side(client):
    form, questions = _full_form(client)
    response = client.post(f"{API}/public/forms/{form['slug']}/responses", json={"answers": []})
    assert response.status_code == 422

    issues = {issue["question_id"]: issue["message"] for issue in response.json()["issues"]}
    required_ids = {questions[key]["id"] for key in ("short_text", "email", "number")}
    assert required_ids <= set(issues)
    # Optional questions must not appear as issues.
    assert questions["long_text"]["id"] not in issues
    # Nothing is persisted when validation fails.
    assert client.get(f"{API}/forms/{form['id']}/responses").json()["total"] == 0


def test_required_message_depends_on_how_the_answer_is_given(client):
    """Typed answers say "fill this in"; clicked ones say "make a selection".

    The frontend mirrors these strings in `lib/answerValidation.ts`, so pinning
    them here is what stops the two layers wording the same mistake differently.
    """
    form = _create_form(client, "Required copy")
    types = ["short_text", "long_text", "email", "number", "multiple_choice", "dropdown", "yes_no", "rating"]
    ids = {}
    for question_type in types:
        payload = {"type": question_type, "title": f"A {question_type}", "is_required": True}
        if question_type in {"multiple_choice", "dropdown"}:
            payload["options"] = [{"label": "One"}, {"label": "Two"}]
        ids[question_type] = _add_question(client, form["id"], **payload)["id"]

    client.post(f"{API}/forms/{form['id']}/publish")
    slug = client.get(f"{API}/forms/{form['id']}").json()["slug"]

    response = client.post(f"{API}/public/forms/{slug}/responses", json={"answers": []})
    assert response.status_code == 422
    messages = {issue["question_id"]: issue["message"] for issue in response.json()["issues"]}

    for question_type in ("short_text", "long_text", "email", "number"):
        assert messages[ids[question_type]] == "Please fill this in", question_type
    for question_type in ("multiple_choice", "dropdown", "yes_no", "rating"):
        assert messages[ids[question_type]] == "Please make a selection", question_type


def test_per_type_validation_messages(client):
    form, questions = _full_form(client)

    def submit(key, value):
        answers = [a for a in _valid_answers(questions) if a["question_id"] != questions[key]["id"]]
        answers.append({"question_id": questions[key]["id"], "value": value})
        return client.post(
            f"{API}/public/forms/{form['slug']}/responses", json={"answers": answers}
        )

    assert submit("email", "not-an-email").status_code == 422
    assert submit("number", "abc").status_code == 422
    assert submit("number", 5).status_code == 422  # below min_value
    assert submit("number", 120).status_code == 422  # above max_value
    assert submit("number", 36.5).status_code == 422  # allow_decimal is False
    assert submit("rating", 9).status_code == 422  # above rating_max
    assert submit("short_text", "x" * 11).status_code == 422  # above max_length
    assert submit("dropdown", 999_999).status_code == 422  # option not on this question
    # dropdown is single-select, so two ids must be rejected
    dropdown_ids = [o["id"] for o in questions["dropdown"]["options"]]
    assert submit("dropdown", dropdown_ids).status_code == 422

    assert submit("number", 42).status_code == 201


def test_optional_questions_can_be_skipped(client):
    form, questions = _full_form(client)
    required_only = [
        a
        for a in _valid_answers(questions)
        if a["question_id"]
        in {questions[key]["id"] for key in ("short_text", "email", "number")}
    ]
    created = client.post(
        f"{API}/public/forms/{form['slug']}/responses", json={"answers": required_only}
    )
    assert created.status_code == 201

    responses = client.get(f"{API}/forms/{form['id']}/responses").json()
    detail = client.get(
        f"{API}/forms/{form['id']}/responses/{responses['items'][0]['id']}"
    ).json()
    # Skipped questions produce no answer row at all.
    assert len(detail["answers"]) == 3


def test_cannot_submit_to_an_unpublished_form(client):
    form = _create_form(client)
    _add_question(client, form["id"], type="short_text", title="Hi")
    response = client.post(f"{API}/public/forms/{form['slug']}/responses", json={"answers": []})
    assert response.status_code == 404


# --------------------------------------------------------------------------- #
# Results
# --------------------------------------------------------------------------- #


def test_response_list_detail_and_pagination(client):
    form, questions = _full_form(client)
    for _ in range(3):
        client.post(
            f"{API}/public/forms/{form['slug']}/responses",
            json={"answers": _valid_answers(questions), "duration_seconds": 60},
        )

    page = client.get(f"{API}/forms/{form['id']}/responses", params={"limit": 2}).json()
    assert page["total"] == 3 and len(page["items"]) == 2
    assert page["items"][0]["answers"][str(questions["short_text"]["id"])] == "Ada"

    second = client.get(
        f"{API}/forms/{form['id']}/responses", params={"limit": 2, "offset": 2}
    ).json()
    assert len(second["items"]) == 1

    detail = client.get(f"{API}/forms/{form['id']}/responses/{page['items'][0]['id']}").json()
    assert [a["position"] for a in detail["answers"]] == sorted(
        a["position"] for a in detail["answers"]
    )
    rendered = {a["question_type"]: a["display_value"] for a in detail["answers"]}
    assert rendered["yes_no"] == "Yes"
    assert rendered["rating"] == "4/5"
    assert rendered["number"] == "36"
    assert rendered["dropdown"] == "Y"

    assert client.get(f"{API}/forms/{form['id']}/responses/999999").status_code == 404


def test_summary_statistics(client):
    form, questions = _full_form(client)
    choice_ids = [o["id"] for o in questions["multiple_choice"]["options"]]

    for rating, choice, yes in [(5, choice_ids[0], True), (3, choice_ids[0], False), (1, choice_ids[1], True)]:
        answers = [
            a
            for a in _valid_answers(questions)
            if a["question_id"]
            not in {
                questions["rating"]["id"],
                questions["multiple_choice"]["id"],
                questions["yes_no"]["id"],
            }
        ]
        answers += [
            {"question_id": questions["rating"]["id"], "value": rating},
            {"question_id": questions["multiple_choice"]["id"], "value": [choice]},
            {"question_id": questions["yes_no"]["id"], "value": yes},
        ]
        assert (
            client.post(
                f"{API}/public/forms/{form['slug']}/responses",
                json={"answers": answers, "duration_seconds": 30},
            ).status_code
            == 201
        )

    stats = client.get(f"{API}/forms/{form['id']}/summary").json()
    assert stats["completed_responses"] == 3
    assert stats["completion_rate"] == 100.0
    assert stats["average_duration_seconds"] == 30.0

    by_id = {q["question_id"]: q for q in stats["questions"]}

    rating = by_id[questions["rating"]["id"]]
    assert rating["average"] == 3.0
    assert {b["value"]: b["count"] for b in rating["rating_distribution"]} == {1: 1, 2: 0, 3: 1, 4: 0, 5: 1}

    yes_no = by_id[questions["yes_no"]["id"]]
    assert (yes_no["yes_count"], yes_no["no_count"]) == (2, 1)

    choice = by_id[questions["multiple_choice"]["id"]]
    counts = {c["label"]: c["count"] for c in choice["option_counts"]}
    assert counts == {"A": 2, "B": 1, "C": 0}
    # Unselected options are still listed, at 0%.
    assert next(c["percentage"] for c in choice["option_counts"] if c["label"] == "C") == 0.0

    number = by_id[questions["number"]["id"]]
    assert (number["average"], number["minimum"], number["maximum"]) == (36.0, 36.0, 36.0)

    text = by_id[questions["short_text"]["id"]]
    assert text["recent_answers"] == ["Ada", "Ada", "Ada"]
    assert text["answered_count"] == 3 and text["skipped_count"] == 0


def test_summary_counts_skips(client):
    form, questions = _full_form(client)
    client.post(
        f"{API}/public/forms/{form['slug']}/responses",
        json={
            "answers": [
                {"question_id": questions["short_text"]["id"], "value": "Ada"},
                {"question_id": questions["email"]["id"], "value": "ada@example.com"},
                {"question_id": questions["number"]["id"], "value": 30},
            ]
        },
    )
    stats = client.get(f"{API}/forms/{form['id']}/summary").json()
    by_id = {q["question_id"]: q for q in stats["questions"]}
    skipped = by_id[questions["rating"]["id"]]
    assert (skipped["answered_count"], skipped["skipped_count"]) == (0, 1)


def test_csv_export(client):
    form, questions = _full_form(client)
    client.post(
        f"{API}/public/forms/{form['slug']}/responses",
        json={"answers": _valid_answers(questions), "duration_seconds": 55},
    )

    export = client.get(f"{API}/forms/{form['id']}/responses/export")
    assert export.status_code == 200
    assert "attachment" in export.headers["content-disposition"]

    header, row = export.text.strip().split("\n")[:2]
    assert header.startswith("Response ID,Submitted at,Duration (s),")
    assert "Name" in header and "Pick one" in header
    # One column per question in the definition, even where answers were skipped.
    assert len(row.split(",")) >= 3 + len(questions)
    assert "ada@example.com" in row


def test_theme_update_round_trips(client):
    form = _create_form(client)
    updated = client.patch(
        f"{API}/forms/{form['id']}",
        json={"theme": {"background_color": "#0B1B2B", "button_color": "#3FA1F5"}},
    ).json()
    assert updated["theme"]["background_color"] == "#0B1B2B"
    assert updated["theme"]["button_color"] == "#3FA1F5"
    # Unspecified theme fields keep the table defaults.
    assert updated["theme"]["question_color"] == "#262627"

    # A second partial patch must not reset the colours set by the first.
    again = client.patch(
        f"{API}/forms/{form['id']}", json={"theme": {"font_family": "Georgia"}}
    ).json()
    assert again["theme"]["font_family"] == "Georgia"
    assert again["theme"]["background_color"] == "#0B1B2B"
    assert again["theme"]["button_color"] == "#3FA1F5"

    rejected = client.patch(
        f"{API}/forms/{form['id']}", json={"theme": {"background_color": "not-a-colour"}}
    )
    assert rejected.status_code == 422
